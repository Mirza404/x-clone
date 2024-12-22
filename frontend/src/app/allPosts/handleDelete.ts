import axios from "axios";

export default async function handleDelete(id: string): Promise<void> {
  console.log("Delete post with id:", id);

  try {
    const response = await axios.delete(
      `http://localhost:3001/api/post/delete`,
      {
        data: { id },
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log(response.data);
  } catch (error) {
    console.error("Error:", error);
  }
}
