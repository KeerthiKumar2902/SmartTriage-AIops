import express from 'express';
import { PrismaClient } from '@prisma/client';
import { GoogleGenAI } from '@google/genai';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

const prisma = new PrismaClient();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/v1/incidents/triage', async (req, res) => {
  try {
    const { service_affected, raw_log } = req.body;

    if (!service_affected || !raw_log) {
      return res.status(400).json({ error: 'service_affected and raw_log are required' });
    }

    // Call Gemini API
    const prompt = `Act as a Senior SRE. Analyze this server error log. Return ONLY a raw, stringified JSON object containing three keys: root_cause (short string), severity_score (integer 1-10), and bash_remediation (a one-line linux bash command to fix it). Do not include markdown formatting.\n\nLog:\n${JSON.stringify(raw_log)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const aiText = response.text;
    
    // Parse the AI response (assuming it's strict JSON without markdown)
    let aiParsed = {};
    try {
        // Strip markdown blocks if AI ignored the prompt
        const cleanedText = aiText.replace(/```json/gi, '').replace(/```/g, '').trim();
        aiParsed = JSON.parse(cleanedText);
    } catch (e) {
        console.error("Failed to parse Gemini response", aiText, e);
    }

    // Save to database
    const incident = await prisma.incident.create({
      data: {
        service_affected,
        raw_log,
        ai_root_cause: aiParsed.root_cause || null,
        severity_score: aiParsed.severity_score || null,
        bash_remediation: aiParsed.bash_remediation || null,
      },
    });

    // Send Discord notification
    if (process.env.DISCORD_WEBHOOK_URL) {
      const discordPayload = {
        embeds: [
          {
            title: `🚨 Incident Alert: ${service_affected}`,
            color: 16711680, // Red color
            description: `**Incident ID:** ${incident.id}\n**Severity:** ${aiParsed.severity_score || 'N/A'}/10\n\n**Root Cause:**\n${aiParsed.root_cause || 'N/A'}`,
            fields: [
              {
                name: 'Bash Remediation',
                value: aiParsed.bash_remediation ? `\`\`\`bash\n${aiParsed.bash_remediation}\n\`\`\`` : 'N/A',
              }
            ],
            timestamp: new Date().toISOString()
          }
        ]
      };

      await axios.post(process.env.DISCORD_WEBHOOK_URL, discordPayload).catch(err => console.error("Discord webhook failed", err.message));
    }

    res.status(201).json({ id: incident.id });
  } catch (error) {
    console.error('Error handling incident:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`SmartTriage AIOps listening on port ${port}`);
});
