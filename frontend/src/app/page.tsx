import React from "react";
import { getServerSession } from "next-auth";

export default async function page() {
  const session = await getServerSession();

  return (
    <>
      getServerSession name result:{" "}
      {session?.user?.name ? (
        <div>{session?.user?.name}</div>
      ) : (
        <div>Not logged in!</div>
      )}
    </>
  );
}
