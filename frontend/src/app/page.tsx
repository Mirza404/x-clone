"use client";
import React from "react";
import { useEffect, useState } from "react";

const page = () => {
  const [message, setMessage] = useState("Loading...");

  useEffect(() => {
    fetch("http://localhost:3001/api/home")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        setMessage(data.message);
      })
      .catch((err) => {
        console.log("Error fetching data: ", err);
      });
  }, []);

  return <div>{message}</div>;
};

export default page;
