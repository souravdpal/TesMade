import mongoose, { Schema } from "mongoose"

const cookieSchema = new Schema ({
    refid : {
        type : String,
        required : true,
    },
    userid : {
        type:Schema.Types.ObjectId,
        ref : "User",
        required :  true,
    },
    sessionid : {
        type : String,
        required : false,
    },
    sessionexp : {
        type : Number,
        required : false,
    },
    refexp : {
        type : Number,
        required : true,
    },
    ip : {
        type : String,
        required: true,
    }

})

export default mongoose.models.Cookiesdb || mongoose.model("Cookiesdb", cookieSchema);