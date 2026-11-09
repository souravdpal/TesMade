import { error } from "console";
import mongoose from "mongoose";
import { cache } from "react";
import { promiseHooks } from "v8";

const MONGO_URI = process.env.MONGODB_URI
if(!MONGO_URI) throw new Error("Please define a mongo uri")
let cached = (global as any).mongoose
if(!cached) cached = (global as any).mongoose = {conn:null,promise:null}

export async function connectDB() {
    if(cached.conn) return cached.conn
    
    if(!cached.promise){
        if(!MONGO_URI) throw new Error("Please define a mongo uri")
        cached.promise=mongoose.connect(MONGO_URI , {bufferCommands:false})
    }
    cached.conn = await cached.promise;
    return cached.conn
}