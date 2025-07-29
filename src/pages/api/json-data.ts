import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'content.json');

// Ensure data directory exists
const ensureDataDirectory = () => {
  const dataDir = path.dirname(DATA_FILE_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

// Default JSON content
const defaultContent = {
  title: "Sample JSON Data",
  description: "This is editable content",
  items: [
    { id: 1, name: "Item 1", value: "Value 1" },
    { id: 2, name: "Item 2", value: "Value 2" },
    { id: 3, name: "Item 3", value: "Value 3" }
  ],
  metadata: {
    version: "1.0.0",
    lastModified: new Date().toISOString()
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  ensureDataDirectory();

  switch (req.method) {
    case 'GET':
      try {
        let content;
        if (fs.existsSync(DATA_FILE_PATH)) {
          const fileContent = fs.readFileSync(DATA_FILE_PATH, 'utf8');
          content = JSON.parse(fileContent);
        } else {
          // Create default file if it doesn't exist
          content = defaultContent;
          fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(content, null, 2), 'utf8');
        }
        res.status(200).json(content);
      } catch (error) {
        console.error('Error reading JSON file:', error);
        res.status(500).json({ error: 'Failed to read JSON data' });
      }
      break;

    case 'POST':
      try {
        const { data } = req.body;
        if (!data) {
          return res.status(400).json({ error: 'No data provided' });
        }

        // Update metadata
        const updatedData = {
          ...data,
          metadata: {
            ...data.metadata,
            lastModified: new Date().toISOString()
          }
        };

        fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(updatedData, null, 2), 'utf8');
        res.status(200).json({ message: 'JSON data saved successfully', data: updatedData });
      } catch (error) {
        console.error('Error saving JSON file:', error);
        res.status(500).json({ error: 'Failed to save JSON data' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}