const port = 4000;
import express from "express";

import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import cors from "cors";
import serverless from "serverless-http";

const app = express();

app.use(express.json());
app.use(cors());

//Database connection with mongdb
mongoose.connect(
  "mongodb+srv://tahasniper312sniper:ws01261145780078@cluster0.qe8n35z.mongodb.net/e-commerce"
);

app.get("/", (req, res) => {
  res.send("Express app is running ");
});

//images stored ingine

const storage = multer.diskStorage({
  destination: "./upload/images",
  filename: (req, file, cb) => {
    return cb(
      null,
      `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

const upload = multer({ storage: storage });

//creating upload endpoint for images
app.use("/images", express.static("upload/images"));
app.post("/upload", upload.single("product"), (req, res) => {
  res.json({
    success: 1,
    image_url: `http://localhost:${port}/images/${req.file.filename}`,
  });
});

//Schema for creating products
const Product = mongoose.model("Product", {
  id: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  new_price: {
    type: Number,
    required: true,
  },
  old_price: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  avilable: {
    type: Boolean,
    default: true,
  },
});

app.post("/addproduct", async (req, res) => {
  let products = await Product.find({});
  let id;
  if (products.length > 0) {
    let last_product_array = products.slice(-1);
    let last_product = last_product_array[0];
    id = last_product.id + 1;
  } else {
    id = 1;
  }

  const product = new Product({
    id: id,
    name: req.body.name,
    image: req.body.image,
    category: req.body.category,
    new_price: req.body.new_price,
    old_price: req.body.old_price,
  });
  console.log(product);
  await product.save();
  console.log("saved");
  res.json({
    success: true,
    name: req.body.name,
  });
});

//creation api for deleting
app.post("/removeproduct", async (req, res) => {
  await Product.findOneAndDelete({ id: req.body.id });
  console.log("removed");
  res.json({
    success: true,
    name: req.body.name,
  });
});

//creating api for getting product

app.get("/allproducts", async (req, res) => {
  let products = await Product.find({});
  console.log("all product fetched");
  res.send(products);
});



//creating endpoint for newCloection
app.get('/newcollections',async(req,res)=>{
        let products = await Product.find({});
        let newcollection = products.slice(1).slice(-10);
        
        res.send(newcollection);
})

//creating popular in women section
app.get('/popularinwomen' , async (req, res) => {
    let products = await Product.find({category:"women"});
    let popular_in_women = products.slice(0,4);
    
    res.send(popular_in_women);
})

//creating related products 
app.get('/relatedProdcutss' , async (req, res) => {
  let products = await Product.find({category:"men"});
  let related_products = products.slice(0,4);
  
  res.send(related_products);
})


//creating middleware to fetch user 
const fetchUser = async (req, res , next) => {
  const token = req.header('auth-token');
  if(!token){
    res.status(401).send({error: "Please authentication using valid token"})
  }
  else{

    try{
         const data = jwt.verify(token,'secret_ecom');
         req.user = data.user;
         next();
    }catch(error){
       res.status(401).send({error:"please authantication useing a valid token"})
  }
}
};

//Creating endpoint for cart items data
app.post('/addtocart', fetchUser, async (req,res) => {
  console.log("Added",req.body.itemId);
  let userData = await Users.findOne({_id:req.user.id})
  userData.cartData[req.body.itemId] +=1;
  await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
  res.send("added")

});

//creating endpoint to get cart data by user
app.post('/getcart', fetchUser, async (req,res) => {
  console.log("Get Cart");
  let userData = await Users.findOne({_id:req.user.id});
  res.json(userData.cartData);

});

//creating api thats remove item form cart by user id 
app.post('/removefromcart', fetchUser, async (req,res) => {
  console.log("removed",req.body.itemId);
  let userData = await Users.findOne({_id:req.user.id})
  if(userData.cartData[req.body.itemId]>0)
  userData.cartData[req.body.itemId] -=1;
  await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
  res.send("Removed")
   

})


// schema creation for user modle

const Users = mongoose.model("Users", {
  name: {
    type: String,
  },
  email: {
    type: String,
    unique: true,
  },
  password: {
    type: String,
  },
  cartData: {
    type: Object,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

//creating endpoint for registring user
app.post("/signup", async (req, res) => {
  let check = await Users.findOne({ email: req.body.email });
  if (check) {
    return res
      .status(400)
      .json({ success: false, errors: "existing user found with same email" });
  }
  let cart = {};
  for (let i = 0; i < 300; i++) {
    cart[i] = 0;
  }
  const user = new Users({
    name: req.body.username,
    email: req.body.email,
    password: req.body.password,
    cartData: cart,
  });

  await user.save();

  const data = {
    user: {
      id: user.id,
    },
  };

  const token = jwt.sign(data, "secret_ecom");
  res.json({ success: true, token });
});

//creating end poit for user login

app.post("/logain", async ( req, res) => {
  let user = await Users.findOne({ email:req.body.email });
  if (user) {
    const passCompare = req.body.password === user.password;
    if (passCompare) {
      const data = {
        user: {
          id: user.id,
        },
      };
      const token = jwt.sign(data, "secret_ecom");
      res.json({ success: true, token });
    } else {
      res.json({ success: false, errors: "wrong password" });
    }
  } else {
    res.json({ success: false, errors: "wrong email Id" });
  }
});


//creatting port app
app.listen(port, (err) => {
  if (!err) {
    console.log("Server running on port " + port);
  } else {
    console.log("Error:" + error );
  }
});
