const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
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
     



    app.get("/users", async (req, res) => {
      const result = await userCollention.find().toArray();
      res.send(result);
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
    app.patch("/users/admin/:id", async (req, res) => { 
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
    app.delete("/users/:id", async (req, res) => { 
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await userCollention.deleteOne(query);
      res.send(result);
    })
    

      app.get('/menu', async (req, res) => {
          const result = await menuCollention.find().toArray();
          res.send(result)
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