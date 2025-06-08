import jwt from "jsonwebtoken"
export default function authenticate(req,res,next){
    const authheader=req.headers["authorization"];
    const token=authheader&&authheader.split(" ")[1];
    if(token==null)return res.send(401).json({access:"Unauthorized"})
    jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,user)=>{
      if(err)return res.sendStatus(403)
      req.user=user
       next()
})
}