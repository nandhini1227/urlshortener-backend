import express from "express";
import bcrypt from "bcrypt";
import {
  addUser,
  getUser,
  getUserByID,
  resetPassword,
  activationMail,
  forgotPassword,
  activateAccount,
  generateToken,
  generateActivationToken,
  generateUserToken,
} from "../controller/user.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

const router = express.Router();

const transporter = nodemailer.createTransport({
  service: "Outlook",
  auth: {
    user: process.env.EMAIL, // Use environment variable
    pass: process.env.PASS,   // Use environment variable
  },
});

// ... user routes (get a user, get user by id) with similar improvements

// Add new user (signup)
router.post("/signup", async (req, res) => {
  try {
    // Hashing user password
    console.log("Adding user");
    const salt = await bcrypt.genSalt(10);
    const user = await getUser({ email: req.body.email });

    // Validate if user already exists
    if (user) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(req.body.password, salt);
    const activationKey = Math.random().toString(36).substring(2, 9);
    const hashedUser = {
      ...req.body,
      password: hashedPassword,
      isActivated: false,
      activationKey,
    };

    const result = await addUser(hashedUser);

    // Generate token to activate account
    const secret = activationKey;
    const token = generateActivationToken(hashedUser._id, secret);

    const link = `<span class="math-inline">\{process\.env\.FR\_URL\}activate/</span>{hashedUser._id}?activateToken=${token}`; // Use environment variable for front-end URL
    const mailOptions = {
      from: process.env.EMAIL, // Use environment variable for email
      to: hashedUser.email,
      subject: "Account Activation link sent",
      text: `Click on the below link to activate your account. This link is valid for 48 hours after which link will be invalid. ${link}`,
    };

    // Check MongoDB acknowledgment
    if (!result.acknowledged) {
      return res.status(404).json({ message: "Error uploading user information" });
    } else {
      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log("Email not sent", error);
          return res.status(400).send({
            message: "Error sending email",
            result: result.acknowledged,
          });
        } else {
          console.log("Email sent:", info.response);
          return res.status(200).send({
            result: result.acknowledged,
            message: "Activation link sent",
            data: hashedUser.email,
          });
        }
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// verifying and authorizing token to allow reset password
router.get("/forgot-password/authorize/:id/:token", async (req, res) => {
    try {
      const { id, token } = req.params;
      console.log("veifying token");
      if (!id) {
        return res.status(404).json({ message: "User does not exist" });
      }
      if (!token) {
        return res.status(404).json({ message: "Invalid authorization" });
      }
      const user = await getUserByID(id);
      if (!user) {
        return res.status(404).json({ message: "Invalid Email" });
      }
      try {
        const decode = jwt.verify(token, user.password);
        //console.log(decode);
        if (decode.id) {
          res.status(200).json({ decode: decode });
        }
      } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Token error", error: err });
      }
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Resetting password in DB
  router.post("/reset-password/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const user = await getUserByID(id);
      const salt = await bcrypt.genSalt(10);
      if (!user) {
        return res.status(404).json({ message: "Invalid Email" });
      }
      const hashedPassword = await bcrypt.hash(req.body.password, salt);
      const result = await resetPassword(id, { password: hashedPassword });
      if (!result.lastErrorObject.updatedExisting) {
        return res.status(400).json({ message: "Error resetting password" });
      }
      res
        .status(200)
        .send({ result: result.lastErrorObject.updatedExisting, user: user });
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  //login to user account
  router.post("/login", async (req, res) => {
    try {
      console.log("user login..");
      //user exist validations
      const user = await getUser({ email: req.body.email });
      if (!user) {
        return res.status(404).json({ message: "Invalid Email" });
      }
      if (!user.isActivated) {
        return res.status(404).json({ message: "Account not activated" });
      }
      // validating password
      const validPassword = await bcrypt.compare(
        req.body.password,
        user.password
      );
      if (!validPassword) {
        return res.status(400).json({ message: "Invalid Password" });
      }
      const token = generateUserToken(user._id, process.env.SECRET_KEY);
      res.status(200).json({
        data: {
          fname: user.fname,
          lname: user.lname,
          email: user.email,
          id: user._id,
        },
        token: token,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  export const userRouter = router;
