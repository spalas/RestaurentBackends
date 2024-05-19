const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.PAYMENT_METHOD_TEST_KEY)
const port = process.env.PORT || 5000

// middleware
app.use(cors())
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@palash.fofcwzp.mongodb.net/?retryWrites=true&w=majority&appName=palash`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
      await client.connect();
      
      
    const userCollention = client.db("restautandb").collection("users");
    const menuCollention = client.db("restautandb").collection("menu");
    const reviewsCollention = client.db("restautandb").collection("reviews");
    const cartsCollention = client.db("restautandb").collection("carts");
     
    // jwt authorization
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h"
      });
      res.send({ token });
    })


    //  middleware
    
    const verifyToken = (req, res, next) => {
      // console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorzied access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'Forbidden access' })
          
        }
        req.decoded = decoded;
         next()
      })
     
     }

    // use verify admin after verify token

    const verifyAdmin = async(req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollention.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) { 
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
     }



    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      
      const result = await userCollention.find().toArray();
      res.send(result);
    })

    //  admin api call
    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(401).send({ message: 'forbidden access' });
      }
      const query = { email: email };
      const user = await userCollention.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({admin});



     })




    app.post("/users", async (req, res) => {
      const user = req.body;

      // insert email if user doesnt exist in database
      // you can do this many ways (1. email 2, upsert , simple check)
      const query = { email: user.email }
      const existinguser = await userCollention.findOne(query);
      if (existinguser) {
        return res.send({message: " user already exists", insertedId: null})
      }
      const result = await userCollention.insertOne(user);
      res.send(result);
    })


    
    // make admin
    app.patch("/users/admin/:id",  verifyToken, verifyAdmin,  async (req, res) => { 
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin',
        }
      }

      const result = await userCollention.updateOne(filter, updatedDoc);
      res.send(result)

    })



    // delete user
    app.delete("/users/:id",verifyToken, verifyAdmin, async (req, res) => { 
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await userCollention.deleteOne(query);
      res.send(result);
    })
    


      app.get('/menu',  async (req, res) => {
          const result = await menuCollention.find().toArray();
          res.send(result)
      })
    
    //  menu posting request

    app.post('/menu', verifyToken, verifyAdmin, async (req, res) => {
      const item = req.body;
      const result = await menuCollention.insertOne(item);
      res.send(result)
    })
// updated menu posting

app.patch('/menu/:id', verifyToken, verifyAdmin, async (req, res) => {
  const item = req.body;
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) }
  const updatedDoc = {
    $set: {
      name: item.name,
      category: item.category,
      price: item.price,
      recipe: item.recipe,
      image: item.image
    }
  }

  const result = await menuCollention.updateOne(filter, updatedDoc)
  res.send(result);
})


    // update menu item list
    app.get("/menu/:id", async (req, res) => { 
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await menuCollention.findOne(query);
      res.send(result);
    })
    
    // delete menu item 

    app.delete("/menu/:id",verifyToken, verifyAdmin, async (req, res) => { 
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await menuCollention.deleteOne(query);
      res.send(result);
    })
      
    
      app.get('/reviews', async (req, res) => {
          const result = await reviewsCollention.find().toArray();
          res.send(result)
       })


    // carts collselection

    app.get('/carts', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartsCollention.find(query).toArray();
      res.send(result)
     })


    app.post('/carts', async (req, res) => { 
      const cartItem = req.body;
      const result = await cartsCollention.insertOne(cartItem)
      res.send(result)
    })

    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartsCollention.deleteOne(query);
      res.send(result);

    })
    


    // payment intent
    // app.post('/create-payment-intent', async (req, res) => {
    //   const { price } = req.body;
    //   const amount = parseInt(price * 100);
    //   console.log(amount)
    //   const paymentIntent = await stripe.createPaymentIntents.create({
    //     amount: amount,
    //     currency: 'usd',
    //     payment_method_types: ['card']
    //  })
    //  res.send({
    //   clientSecret: paymentIntent.client_secret,
    // });
    //  })

    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, 'amount inside the intent')

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_Secret
      })
    });




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res) => { 
    res.send("going to data inside")
})

app.listen(port, () => { 
    console.log(`restaurant listening on port${port}`)
})