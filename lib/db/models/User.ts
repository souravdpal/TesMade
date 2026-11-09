import { model, models, Schema } from "mongoose";
import mongoose from "mongoose";

const UserSchema = new Schema(
    {
        userid: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true
        },
        email: {
            type: String,
            require: true
        },

        key: {
            type: String,
            reuqire: true
        },
        isVerfied :{
            default : false,
            type : Boolean
        }




    },
    { timestamps: true }
)

export default models.User || model("User", UserSchema)