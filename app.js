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

app.get('/account/balance', async (req, res) => {
    try {
        const { customerId } = req.query;

        if (!customerId) {
            return res.status(400).json({ error: 'customerId is required' });
        }

        let customers = await readData('customers.json');
        const customer = customers.find(c => c.customerId === customerId);

        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        res.status(200).json({ balance: customer.balance });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.post('/orders/checkout', async (req, res) => {
    try {
        const { customerId } = req.body;

        if (!customerId) {
            return res.status(400).json({ error: 'customerId is required' });
        }


        let customers = await readData('customers.json');
        let products = await readData('products.json');
        let orders = await readData('orders.json');

        const customerIndex = customers.findIndex(c => c.customerId === customerId);
        
        if (customerIndex === -1) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        const customer = customers[customerIndex];


        if (!customer.cart || customer.cart.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }

        let totalOrderPrice = 0;


        for (const item of customer.cart) {
            const product = products.find(p => p.id === item.productId);
            
            if (!product) {
                return res.status(400).json({ error: `Product with ID ${item.productId} no longer exists` });
            }
            
            if (product.stock < item.quantity) {
                return res.status(400).json({ error: `Not enough stock for product: ${product.name}` });
            }
            
            totalOrderPrice += product.price * item.quantity;
        }


        if (customer.balance < totalOrderPrice) {
            return res.status(400).json({ error: 'Insufficient balance to complete the purchase' });
        }


        for (const item of customer.cart) {
            const productIndex = products.findIndex(p => p.id === item.productId);
            products[productIndex].stock -= item.quantity;
        }


        customer.balance -= totalOrderPrice;
        const purchasedItems = [...customer.cart];
        customer.cart = [];


        const newOrder = {
            id: Date.now().toString(), 
            customerId,
            items: purchasedItems,
            total: totalOrderPrice,
            createdAt: new Date().toISOString()
        };
        
        orders.push(newOrder);


        await writeData('products.json', products);
        await writeData('customers.json', customers);
        await writeData('orders.json', orders);

        res.status(200).json({ success: true, order: newOrder });

    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
