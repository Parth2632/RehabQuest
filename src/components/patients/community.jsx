import React, { useEffect, useState } from "react";
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, doc, updateDoc, increment, arrayUnion, arrayRemove, getDoc, deleteDoc } from "firebase/firestore";
import { db, auth } from "../../firebase-config.js";
import { motion } from "framer-motion";
import { Send, ThumbsUp, ThumbsDown, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";

export default function Community() {
  const [posts, setPosts] = useState([]);
  const [message, setMessage] = useState("");
  const [expandedComments, setExpandedComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [editingPostId, setEditingPostId] = useState(null);
  const [editText, setEditText] = useState("");
  const user = auth.currentUser;

  useEffect(() => {
    const q = query(collection(db, "communityPosts"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPosts(list);
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !message.trim()) return;
    await addDoc(collection(db, "communityPosts"), {
      uid: user.uid,
      name: user.displayName || user.email,
      message: message.trim(),
      createdAt: serverTimestamp(),
      upvotes: 0,
      downvotes: 0,
      upvotedBy: [],
      downvotedBy: [],
      comments: []
    });
    setMessage("");
  };

  const handleVote = async (postId, voteType) => {
    if (!user) return;
    
    const postRef = doc(db, "communityPosts", postId);
    const postSnap = await getDoc(postRef);
    const postData = postSnap.data();
    
    const hasUpvoted = postData.upvotedBy?.includes(user.uid);
    const hasDownvoted = postData.downvotedBy?.includes(user.uid);
    
    let updateData = {};
    
    if (voteType === 'upvote') {
      if (hasUpvoted) {
        updateData = {
          upvotes: increment(-1),
          upvotedBy: arrayRemove(user.uid)
        };
      } else {
        updateData = {
          upvotes: increment(1),
          upvotedBy: arrayUnion(user.uid)
        };
        if (hasDownvoted) {
          updateData.downvotes = increment(-1);
          updateData.downvotedBy = arrayRemove(user.uid);
        }
      }
    } else if (voteType === 'downvote') {
      if (hasDownvoted) {
        updateData = {
          downvotes: increment(-1),
          downvotedBy: arrayRemove(user.uid)
        };
      } else {
        updateData = {
          downvotes: increment(1),
          downvotedBy: arrayUnion(user.uid)
        };
        if (hasUpvoted) {
          updateData.upvotes = increment(-1);
          updateData.upvotedBy = arrayRemove(user.uid);
        }
      }
    }
    
    await updateDoc(postRef, updateData);
  };

  const handleComment = async (postId) => {
    if (!user || !commentInputs[postId]?.trim()) return;
    
    const postRef = doc(db, "communityPosts", postId);
    const comment = {
      id: Date.now().toString(),
      uid: user.uid,
      name: user.displayName || user.email,
      message: commentInputs[postId].trim(),
      createdAt: new Date().toISOString()
    };
    
    await updateDoc(postRef, {
      comments: arrayUnion(comment)
    });
    
    setCommentInputs(prev => ({ ...prev, [postId]: "" }));
  };

  const toggleComments = (postId) => {
    setExpandedComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const startEdit = (post) => {
    setEditingPostId(post.id);
    setEditText(post.message);
  };

  const cancelEdit = () => {
    setEditingPostId(null);
    setEditText("");
  };

  const saveEdit = async (postId) => {
    if (!user || !editText.trim()) return;
    const postRef = doc(db, "communityPosts", postId);
    await updateDoc(postRef, { message: editText.trim(), editedAt: serverTimestamp() });
    setEditingPostId(null);
    setEditText("");
  };

  const handleDelete = async (postId, uid) => {
    if (!user || user.uid !== uid) return;
    await deleteDoc(doc(db, "communityPosts", postId));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-blue-100">
        <div className="p-6 border-b border-blue-100">
          <h1 className="text-2xl font-bold text-blue-700">Community</h1>
          <p className="text-gray-600 mt-1">Share encouragement, tips, and wins with others.</p>
        </div>

        {user ? (
          <form onSubmit={handleSubmit} className="p-4 flex gap-3 border-b border-blue-100">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write a supportive message..."
              className="flex-1 px-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <motion.button 
              whileHover={{ scale: 1.03 }} 
              whileTap={{ scale: 0.97 }}
              type="submit" 
              className="bg-gradient-to-r from-blue-400 to-blue-500 text-white px-4 py-3 rounded-lg flex items-center gap-2"
            >
              <Send size={18} /> Post
            </motion.button>
          </form>
        ) : (
          <div className="p-4 text-center text-gray-600 border-b border-blue-100">
            Log in to post. You can still read the feed below.
          </div>
        )}

        <div className="p-4 space-y-4">
          {posts.length === 0 && (
            <p className="text-center text-gray-500">No posts yet. Be the first to say hi!</p>
          )}
          {posts.map((p) => (
            <div key={p.id} className="border border-blue-100 rounded-lg p-4 bg-white">
              <div className="text-sm text-blue-700 font-semibold">{p.name || "Anonymous"}</div>
              {editingPostId === p.id ? (
                <div className="mt-2">
                  <textarea
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm"
                    rows={3}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                  />
                  <div className="mt-2 flex gap-2">
                    <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={() => saveEdit(p.id)} className="px-3 py-1 text-xs rounded-md bg-blue-500 text-white">Save</motion.button>
                    <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={cancelEdit} className="px-3 py-1 text-xs rounded-md bg-gray-100 text-gray-700">Cancel</motion.button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-gray-700 mt-1 whitespace-pre-wrap">{p.message}</p>
                  {p.createdAt?.toDate && (
                    <div className="text-xs text-gray-500 mt-2">
                      {p.createdAt.toDate().toLocaleString()}
                      {p.editedAt?.toDate && <span className="ml-2 italic">(edited)</span>}
                    </div>
                  )}
                </>
              )}
              
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-blue-50">
                {user && (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleVote(p.id, 'upvote')}
                      className={"flex items-center gap-1 px-2 py-1 rounded-md text-xs " + 
                        (p.upvotedBy?.includes(user.uid) 
                          ? 'bg-green-100 text-green-700' 
                          : 'hover:bg-green-50 text-gray-600')
                      }
                    >
                      <ThumbsUp size={14} />
                      <span>{p.upvotes || 0}</span>
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleVote(p.id, 'downvote')}
                      className={"flex items-center gap-1 px-2 py-1 rounded-md text-xs " + 
                        (p.downvotedBy?.includes(user.uid) 
                          ? 'bg-red-100 text-red-700' 
                          : 'hover:bg-red-50 text-gray-600')
                      }
                    >
                      <ThumbsDown size={14} />
                      <span>{p.downvotes || 0}</span>
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleComments(p.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-xs hover:bg-blue-50 text-gray-600"
                    >
                      <MessageCircle size={14} />
                      <span>{p.comments?.length || 0}</span>
                      {expandedComments[p.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </motion.button>

                    {user && p.uid === user.uid && editingPostId !== p.id && (
                      <>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => startEdit(p)}
                          className="px-2 py-1 rounded-md text-xs hover:bg-blue-50 text-gray-600"
                        >
                          Edit
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleDelete(p.id, p.uid)}
                          className="px-2 py-1 rounded-md text-xs hover:bg-red-50 text-red-600"
                        >
                          Delete
                        </motion.button>
                      </>
                    )}
                  </>
                )}
                {!user && (
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <ThumbsUp size={14} /> {p.upvotes || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <ThumbsDown size={14} /> {p.downvotes || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle size={14} /> {p.comments?.length || 0}
                    </span>
                  </div>
                )}
              </div>
              
              {expandedComments[p.id] && (
                <div className="mt-4 space-y-3">
                  {user && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={commentInputs[p.id] || ""}
                        onChange={(e) => setCommentInputs(prev => ({ ...prev, [p.id]: e.target.value }))}
                        placeholder="Write a comment..."
                        className="flex-1 px-3 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                        onKeyPress={(e) => e.key === 'Enter' && handleComment(p.id)}
                      />
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleComment(p.id)}
                        className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm"
                      >
                        <Send size={14} />
                      </motion.button>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    {p.comments?.map((comment) => (
                      <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-blue-600 font-semibold">{comment.name || "Anonymous"}</div>
                        <p className="text-sm text-gray-700 mt-1">{comment.message}</p>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(comment.createdAt).toLocaleString()}
                        </div>
                      </div>
                    )) || []}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
