import express, { Express, Request, Response } from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import mongoose from "mongoose";
import AWS from "aws-sdk";
import fs from "fs";

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/");
  } catch (error) {
    console.log(error);
  }
};
connectDB();

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: "", //access key here
  secretAccessKey: "", //secret key here
  endpoint: "https://gateway.storjshare.io",
  s3ForcePathStyle: true,
  signatureVersion: "v4",
});

// Define a Mongoose schema and model
const emptySchema = new mongoose.Schema({
  file: {
    type: String,
  },
});
const emptyModel = mongoose.model("empty", emptySchema);

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Ensure this folder exists
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Append extension
  },
});

const app: Express = express();
const port = process.env.PORT || 3000;
const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());

// Ensure the uploads directory exists
if (!fs.existsSync("uploads/")) {
  fs.mkdirSync("uploads/");
}

// Configure middleware for file upload
app.post("/upload", upload.single("file"), async (req, res) => {
  console.log(req.body);
  console.log(req.file);

  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  const localPath = req.file.path;
  const remotePath = `uploads/${req.file.originalname}`;
  const bucketName = "tut";

  try {
    const data: any = await uploadToStorj(localPath, remotePath, bucketName);

    // Delete the local file after successful upload
    fs.unlinkSync(localPath);

    res.send(`File uploaded successfully to Storj! Location: ${data.Location}`);
  } catch (error) {
    console.error("Error uploading to Storj:", error);
    res.status(500).send("Error uploading file to Storj.");
  }
});

// Function to upload file to Storj
function uploadToStorj(
  localPath: fs.PathLike,
  remotePath: string,
  bucketName: string
) {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(localPath);
    const params = {
      Bucket: bucketName,
      Key: remotePath,
      Body: fileStream,
    };

    s3.upload(params, (err: any, data: unknown) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

// Start the server
mongoose.connection.once("open", () => {
  console.log("Connected to mongoose");
  app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
  });
});
