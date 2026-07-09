import fs from 'fs/promises';
import path from 'path';


const DB_PATH = process.env.DB_BASE_PATH || './db';


export async function readData(filename) {
    try {
        const filePath = path.join(DB_PATH, filename);
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {

        console.error(`Error reading ${filename}:`, error.message);
        return [];
    }
}


export async function writeData(filename, data) {
    try {
        const filePath = path.join(DB_PATH, filename);

        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error(`Error writing to ${filename}:`, error.message);
        throw error;
    }
}