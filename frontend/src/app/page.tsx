import React from "react";
import { getServerSession } from "next-auth";
import ClientComponent from "./components/ClientComponent";

export default async function page() {
  const session = await getServerSession();

  return (
    <>
      <ClientComponent>
        getServerSession name result:{" "}
        {session?.user?.name ? (
          <div>{session?.user?.name}</div>
        ) : (
          <div>Not logged in!</div>
        )}
      </ClientComponent>
    </>
  );
}
