export default async function handleDelete(id: string): Promise<void> {
  console.log("Delete post with id:", id);

  try {
    const response = await fetch(`http://localhost:3001/api/post/delete`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }), // Pass the id in the body
    });

    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.error("Error:", error);
  }
}
