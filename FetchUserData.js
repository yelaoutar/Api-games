import axios from "axios";
import env from "dotenv";
env.config();
const binId = process.env.BIN_ID;
const apiKey =process.env.USERS_API_KEY ;
const urlGet = `https://api.jsonbin.io/v3/b/${binId}/latest`;
const urlPut=`https://api.jsonbin.io/v3/b/${binId}`
export async function getData(){
    try{
        const response=await axios.get(urlGet,{headers:{"X-Master-Key":apiKey}})
        return response.data.record
    }catch(err){
        console.log(err)
    } 
    
}

export async function UpdateData(data) {
    try{
        const response=await axios.put(urlPut,data,{
            headers:{
                "X-Master-Key":apiKey,
                'Content-Type':'application/json',
            }
        })
        return response.data.record
    }catch(err){
        console.log(err)
    }
    
}
