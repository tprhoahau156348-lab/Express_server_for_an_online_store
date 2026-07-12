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


app.post('/cart/items', async (req, res) => {
    try {
        const { customerId, productId, quantity } = req.body;


        if (!customerId || !productId || quantity === undefined) {
            return res.status(400).json({ error: 'customerId, productId, and quantity are required' });
        }


        if (typeof quantity !== 'number' || quantity <= 0 || !Number.isInteger(quantity)) {
            return res.status(400).json({ error: 'Quantity must be a whole number greater than 0' });
        }

        let products = await readData('products.json');
        const product = products.find(p => p.id === productId);

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        if (product.stock < quantity) {
            return res.status(400).json({ error: 'Not enough stock available' });
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
        }


        const existingCartItem = customer.cart.find(item => item.productId === productId);
        if (existingCartItem) {

            if (existingCartItem.quantity + quantity > product.stock) {
                 return res.status(400).json({ error: 'Total quantity in cart exceeds available stock' });
            }
            existingCartItem.quantity += quantity;
        } else {

            customer.cart.push({ productId, quantity });
        }


        await writeData('customers.json', customers);

        res.status(200).json({ success: true, data: customer.cart });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.delete('/cart/items/:productId', async (req, res) => {
    try {

        const { productId } = req.params;
        const { customerId } = req.body;

        if (!customerId) {
            return res.status(400).json({ error: 'customerId is required' });
        }

        let customers = await readData('customers.json');
        const customerIndex = customers.findIndex(c => c.customerId === customerId);

        if (customerIndex === -1) {
            return res.status(404).json({ error: 'Customer not found' });
        }


        const productIdNum = parseInt(productId, 10);


        customers[customerIndex].cart = customers[customerIndex].cart.filter(
            item => item.productId !== productIdNum
        );

        await writeData('customers.json', customers);
        res.status(200).json({ success: true, data: customers[customerIndex].cart });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
