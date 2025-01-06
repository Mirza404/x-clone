"use client";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

const ACTIVE_ROUTE = "py-1 px-2 text-gray-300 bg-gray-700";
const INACTIVE_ROUTE =
  "py-1 px-2 text-gray-500 hover:text-gray-300 hover:bg-gray-700";

function AuthButton() {
  const { data: session } = useSession();

  if (session) {
    return (
      <>
        <div className="">
          <Link href={"/"}>
            <img
              className="w-10 h-10 rounded-full"

              src={session.user?.image ?? "https://via.placeholder.com/150"}
              alt=""
            />
          </Link>
        </div>
        <button onClick={() => signOut()}>Sign out</button>
      </>
    );
  }
  return (
    <>
      Not signed in <br />
      <button onClick={() => signIn()}>Sign in</button>
    </>
  );
}

export default function NavMenu() {
  const pathname = usePathname();
  return (
    <div>
      <nav className="m-5 px-2">
        <AuthButton />
        <hr className="my-4" />
        <ul>
          <Link href="/posts">
            <li
              className={pathname === "/posts" ? ACTIVE_ROUTE : INACTIVE_ROUTE}
            >
              Home
            </li>
          </Link>
          <Link href="/protected">
            <li
              className={
                pathname === "/protected" ? ACTIVE_ROUTE : INACTIVE_ROUTE
              }
            >
              Protected Route
            </li>
          </Link>
          <Link href="/newPost">
            <li
              className={
                pathname === "/newPost" ? ACTIVE_ROUTE : INACTIVE_ROUTE
              }
            >
              Create Post
            </li>
          </Link>
        </ul>
      </nav>
    </div>
  );
}
