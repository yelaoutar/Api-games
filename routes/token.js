import express from "express";
import jwt from "jsonwebtoken";
import db from "../db.js";
import env from "dotenv";
import redis from "../controllers/redis.js"
const router=express.Router();

env.config();
router.post("/token",async(req,res)=>{
  const refreshToken=req.body.token;
  if (refreshToken==null)return res.sendStatus(401);
  const usernameFromRedis = await redis.get(refreshToken);
  if(!usernameFromRedis){
     const findExistToken=await db.query("SELECT * from refreshtoken where token=$1 and expire_in>now()",[refreshToken]);
    if(findExistToken.rows.length==0)return res.sendStatus(403);
  }
 
  jwt.verify(refreshToken,process.env.REFRECH_TOKEN,(err,user)=>{
    if(err)return res.sendStatus(403);
    const accessToken=jwt.sign({name:user.username},process.env.ACCESS_TOKEN_SECRET,{expiresIn:"15m"});
    res.json({accessToken})
  })
})
export default router;