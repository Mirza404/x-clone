interface Post {
  id: number;
  author: string;
  content: string;
  createdAt: Date;
}

const fetchPosts = (): Promise<Post[]> => {
  return fetch("http://localhost:3001/api/post/allposts")
    .then((response) => response.json())
    .then((data) => data.posts);
};

export default fetchPosts;
