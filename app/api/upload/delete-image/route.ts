import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return Response.json({ error: "No URL provided" }, { status: 400 });
    }

    // Extract public_id
    const parts = url.split("/");
    const fileWithExt = parts.slice(-2).join("/"); // folder/file.jpg
    const public_id = fileWithExt.split(".")[0];

    await cloudinary.uploader.destroy(public_id);

    return Response.json({ success: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Delete failed" }, { status: 500 });
  }
}