import dotenv from 'dotenv';
import express from 'express';
import { readData } from './utils/dbHelpers.js';

import { readData, writeData } from './utils/dbHelpers.js';

dotenv.config();


const app = express();


const PORT = process.env.PORT || 3000;
const STARTING_BALANCE = parseFloat(process.env.STARTING_BALANCE) || 500;



app.use(express.json());


app.get('/', (req, res) => {
    res.status(200).json({ message: 'Welcome to the Online Store API' });
});


app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Server is healthy and running' });
});


app.get('/products', async (req, res) => {
    try {

        let products = await readData('products.json');


        const { inStock, maxPrice, search } = req.query;


        if (inStock === 'true') {
            products = products.filter(product => product.stock > 0);
        }


        if (maxPrice) {
            const max = parseFloat(maxPrice);
            if (!isNaN(max)) {
                products = products.filter(product => product.price <= max);
            }
        }


        if (search) {
            const searchQuery = search.toLowerCase();
            products = products.filter(product => 
                product.name.toLowerCase().includes(searchQuery)
            );
        }


        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.get('/cart', async (req, res) => {
    try {
        const { customerId } = req.query;
        
        if (!customerId) {
            return res.status(400).json({ error: 'customerId is required' });
        }

        let customers = await readData('customers.json');
        let customer = customers.find(c => c.customerId === customerId);


        if (!customer) {
            customer = {
                customerId,
                balance: STARTING_BALANCE,
                cart: [],
                createdAt: new Date().toISOString()
            };
            customers.push(customer);
            await writeData('customers.json', customers);
        }

        res.status(200).json(customer.cart);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
