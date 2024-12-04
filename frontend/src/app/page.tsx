import React from "react";
import { getServerSession } from "next-auth";
import ClientComponent from "./components/ClientComponent";

export default async function page() {
  const session = await getServerSession();
  console.log("NOVII");
  console.log("NOVII");
  console.log("NOVII");
  console.log("NOVII");
  console.log("NOVII");

  console.log("session", session);
  // console.log(');
  

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
