import express from "express";
import env from "dotenv";
import cors from "cors"
import db from "./db.js";
import RouterToken from "./routes/token.js";
import RouterLogin from "./routes/login.js";
import RouterLogout from "./routes/logout.js";
const app = express();
const port = 4000;
env.config();
app.use(express.json());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(cors());

db.connect()

app.use("/api",RouterToken);
app.use("/api",RouterLogin);
app.use("/api",RouterLogout)

app.listen(port,()=>{
    console.log("The app is listening in port "+port)
    
})
