import React, { useState, useEffect } from 'react';
import '../index.css';

const Home: React.FC = () => {
  //   const [posts, setPosts] = useState([]);

  //   useEffect(() => {
  //     // Fetch posts from an API or other source
  //     const fetchPosts = async () => {
  //       const response = await fetch('/api/posts');
  //       const data = await response.json();
  //       setPosts(data);
  //     };

  //     fetchPosts();
  //   }, []);

  return (
    <div>
      <h1 className="font-bold text-center">Home Page</h1>
    </div>
  );
};

export default Home;
