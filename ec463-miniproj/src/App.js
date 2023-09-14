import React, { useState, useEffect } from 'react';
import './App.css';

import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';

import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollectionData } from 'react-firebase-hooks/firestore';

// Import the createRoot() function from react-dom/client
import { createRoot } from 'react-dom/client';

// Initialize firebase app with keys & credentials 
firebase.initializeApp({
  apiKey: "AIzaSyA9UXiRdS6R81U0A5uVxlevx8lgKTkiU9k",
  authDomain: "ec463-miniproj-398821.firebaseapp.com",
  projectId: "ec463-miniproj-398821",
  storageBucket: "ec463-miniproj-398821.appspot.com",
  messagingSenderId: "365913955596",
  appId: "1:365913955596:web:a6e6533bb7571a6fc67d29",
  measurementId: "G-YDRT69HKK3"
})

const auth = firebase.auth();
const firestore = firebase.firestore();

function App() {
  const [user] = useAuthState(auth);

  return (
    <div className="App">
      <header className="App-header">
        <h1 className="App-title">EC463 Chat Room</h1>
      </header>
      <section>
        {user ? <ChatRoom /> : <SignIn />}
      </section>
    </div>
  );
}

function SignIn() {
  const signInWithGoogle = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider);
  };

  return (
    <div>
      <h2>Sign In</h2>
      <button onClick={signInWithGoogle}>Sign In with Google</button>
    </div>
  );
}

function SignOut() {
  return (
    auth.currentUser && (
      <button onClick={() => auth.signOut()}>Sign Out</button>
    )
  );
}

function ChatRoom() {
  const messageRef = firestore.collection('messages');
  const query = messageRef.orderBy('createdAt').limit(25);
  const [messages] = useCollectionData(query, { idField: 'id' });
  const [newMessage, setNewMessage] = useState('');

  const sendMessage = async (e) => {
    e.preventDefault();

    if (newMessage.trim() === '') return;

    await messageRef.add({
      text: newMessage,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      uid: auth.currentUser.uid,
    });

    setNewMessage('');
  };

  return (
    <>
      <div>
        <SignOut />
        {messages && messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
      </div>
      <form onSubmit={sendMessage}>
        <input
          type="text"
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button type="submit">Send</button>
      </form>
    </>
  );
}

function ChatMessage(props) {
  const { text, uid } = props.message;

  return <p>{text}</p>;
}

const root = document.getElementById('root');
const rootElement = createRoot(root);

rootElement.render(<App />);

export default App;
