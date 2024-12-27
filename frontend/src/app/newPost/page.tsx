"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "next-auth/react";
import toast, { Toaster } from "react-hot-toast";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";

const Page = () => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const router = useRouter();
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;

  useEffect(() => {
    const fetchSession = async () => {
      const session = await getSession();
      if (!session || !session.user) {
        router.push("/api/auth/signin");
      } else {
        if (session.user.email) {
          setEmail(session.user.email);
          console.log("email found: ", session.user.email);
        } else {
          console.log("no email found");
        }
        setLoading(false);
      }
    };

    fetchSession();
  }, [router]);

  const newPostMutation = useMutation({
    mutationFn: () => {
      setLoading(true);
      return axios.post(
        `${serverUrl}/api/post/new`,
        {
          content,
          email,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    },
    onSuccess: () => {
      setLoading(false);
      toast.success("Post created successfully!");
      setContent("");
      router.push("/posts");
    },
    onError: (error: any) => {
      setLoading(false);
      toast.error(`Error creating post: ${error.message}`);
    },
  });

  return (  
    <div className="flex items-center justify-center min-h-screen bg-none">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <div className="flex items-center justify-center text-2xl font-bold text-black">
          Email: {email}
        </div>
        <textarea
          className="w-full p-3 border border-gray-300 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter your content here..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <button
          className="mt-4 w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition duration-300"
          onClick={() => newPostMutation.mutate()}
          disabled={loading}
        >
          {loading ? "Submitting..." : "Submit"}
        </button>
        <Toaster />
      </div>
    </div>
  );
};

export default Page;
