import dotenv from 'dotenv';
import express from 'express';


dotenv.config();


const app = express();


const PORT = process.env.PORT || 3000;


app.use(express.json());


app.get('/', (req, res) => {
    res.status(200).json({ message: 'Welcome to the Online Store API' });
});


app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Server is healthy and running' });
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
