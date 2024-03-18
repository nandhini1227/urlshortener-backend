console.log("URL Shortener");

import express from "express";
import dotenv from "dotenv";
import cors from "cors";


import { userRouter } from "./routes/users.js";
import { urlRouter } from "./routes/urls.js";


import { isAuthenticated } from "./Authentication/userAuth.js";


import { getURL } from './controller/url.js';

dotenv.config();

const PORT = process.env.PORT || 5000; 

const app = express();


app.use(express.json()); 
app.use(cors());          


app.use("/user", userRouter);


app.use("/url", isAuthenticated, urlRouter);


app.get("/", (req, res) => {
  res.send({ message: "Connection working - URL shortener app" });
});


app.get("/:urlID", async (req, res) => {
  try {
    const url = await getURL({ urlID: req.params.urlID });
    if (url) {
      console.log("Redirecting");
      // Choose redirect or JSON response based on your preference:
       return res.status(302).redirect(url.longURL);  
      return res.status(200).json({ longURL: url.longURL });  
    } else {
      return res.status(404).json({ message: "No URL Found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json("Server Error");
  }
});

app.listen(PORT, () =>
  console.log(`Server started at http://localhost:${PORT}`)
);
