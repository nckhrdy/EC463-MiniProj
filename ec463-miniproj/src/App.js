import React, { useState, useEffect, useRef } from 'react';
import './App.css';

import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';

import { useAuthState } from 'react-firebase-hooks/auth';

// Import the createRoot() function from react-dom/client
import { createRoot } from 'react-dom/client';
import { documentId, QuerySnapshot, onSnapshot } from 'firebase/firestore';
import 'firebase/auth';

// Initialize firebase app with keys & credentials 
firebase.initializeApp({
  apiKey:  
  authDomain: "ec463-miniproj-398821.firebaseapp.com",
  projectId: "ec463-miniproj-398821",
  storageBucket: "ec463-miniproj-398821.appspot.com",
  messagingSenderId: "365913955596",
  appId: "1:365913955596:web:a6e6533bb7571a6fc67d29",
  measurementId: "G-YDRT69HKK3"
})

const auth = firebase.auth();
const firestore = firebase.firestore();

// Enable/disable additional debug metrics 
const debugMode = true;


function App() {  
  const [user] = useAuthState(auth);

  return (
    <div className="App">
      <header className="App-header">
        <h1 className="App-title">☁️</h1>
      </header>
      <section>
        {user ? <ChatApp/> : <SignIn/>}
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
    <div align="center">
      <button onClick={signInWithGoogle}>Sign In</button>
    </div>
  );
}

function SignOut() {
  return ((<button onClick={() => { if (auth == null || auth.currentUser == null || auth.currentUser.uid == null) window.close(); else auth.signOut(); }}>Sign Out</button>));
}


// Synchronizes user data within the 'users' collection or adds them if they don't exist
function syncUser() {
  if (auth.currentUser) {
    const currentUser = firestore.collection('users').doc(auth.currentUser.uid).set({
      displayName: auth.currentUser.displayName,
      email: auth.currentUser.email.toLowerCase(),
      photoURL: auth.currentUser.photoURL,
      lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
      uid: auth.currentUser.uid,
    });
    
    const currentUserEmailRef = firestore.collection('usersEmail').doc(auth.currentUser.email.toLowerCase()).set({
      uid: auth.currentUser.uid,
      email: auth.currentUser.email.toLowerCase(),
    });
  }
}

// Fucntion to present debug metrics after login if 'debugMode' is enabled  
function DebugTools() {
  if (debugMode) {
    return (
      <>
      <p>Current User Email: {auth.currentUser.email.toLowerCase()}</p>
      <p>Current User Name: {auth.currentUser.displayName}</p>
      <p>Current User photoURL: {auth.currentUser.photoURL}</p>
      <p>Current User uid: {auth.currentUser.uid}</p>
      <p>Current User Last Login: {auth.currentUser.lastLogin}</p>
      </>
    );
  }
}



// Primary chat app (user must be signed in) 
function ChatApp() {
  // Synchronize user data after signing in
  syncUser();

  const [chatWith, setChatWith] = useState('');
  const [chatWithUID, setChatWithUID] = useState('');
  const [messageCollection, setMessageCollection] = useState('');

  const launchConversation = async (event, currentUID) => {
    event.preventDefault();
    
    // Sanitizes user input before attempting query
    if (chatWith.trim() === '') { alert("Please enter the email of a registered user."); return; }
    if (chatWith.trim() === auth.currentUser.email.toLowerCase()) { alert("You cannot create a conversation with yourself. Please enter the email of another registered user."); return; }

    // Generate and execute query to get user document matching given email 
    const querySnapshot = await firestore.collection('users').where('email', "==", chatWith.toLowerCase()).get();
    const invalidUserQuery = querySnapshot.empty;

    //if the user is found, set the chat to be between current user's email and user entered's email
    if (!invalidUserQuery) {
      const userDoc = querySnapshot.docs[0];
      const targetUID = userDoc.data().uid;

      setChatWithUID(targetUID);

      //check if a conversation already exists
      const conversationQuery = await firestore.collection('conversations').where('uidA', 'in', [auth.currentUser.uid, targetUID]).where('uidB', 'in', [auth.currentUser.uid, targetUID]).get();
      //if the query for an existing conversation returns empty, set the query to be invalid
      const invalidConversationQuery = conversationQuery.empty;

      //if there was no chat with the uid's found, create a new chat conversation.
      if (invalidConversationQuery) {
        const storedConverstations = firestore.collection('conversations');
        const newChat = await storedConverstations.add({
          uidA: auth.currentUser.uid,
          uidB: targetUID,
          emailA: auth.currentUser.email.toLowerCase(),
          emailB: chatWith.toLowerCase(),
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        
        const messages = await newChat.collection('messages').add({
          msg: "This is the start of our conversation!",
          uidSender:  auth.currentUser.uid,
          nameSender:  auth.currentUser.displayName,
          photoSender:  auth.currentUser.photoURL,
          sentAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Query and find the ID of the conversation between the two users
      const existingConversationQuery = await firestore.collection('conversations').where('uidA', 'in', [auth.currentUser.uid, targetUID]).where('uidB', 'in', [auth.currentUser.uid, targetUID]).get();
      const conversationID = existingConversationQuery.docs[0].id;

      // Query and retrieve the last ten messages in the conversation 
      const messageCollection = "conversations/" + conversationID + "/messages";

      setMessageCollection(messageCollection);
      
    } else alert("Please enter the email of a registered user.");
  }

  if (!messageCollection) {
    return (
      <> 
        <div>
          <>
          <form onSubmit={(e) => launchConversation(e, auth.currentUser)}>
            <input
              type="text"
              placeholder="Chat with..."
              value={chatWith}
              onChange={(e) => setChatWith(e.target.value)}
            />
            <input type="submit" value="Submit"/>
          </form>
          </>
        </div>
        <div><SignOut /></div>
      </>
    );
  } else {
    return (
      <>
        <div>
          <>
          <Conversation messageCollection={messageCollection} />
          </>
        </div>
      </>
    );
  }
}




const Conversation = ({ messageCollection }) => {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const messagesQuery = firestore.collection(messageCollection).orderBy('sentAt', 'desc').limit(30);

    const unsubscribeFunc = onSnapshot(messagesQuery, (QuerySnapshot) => {
      const messages = [];

      QuerySnapshot.forEach((doc) => { messages.push({ ...doc.data(), id: doc.id }); });
      const sortedMessages = messages.sort((a, b) => a.sentAt - b.sentAt);
      setMessages(sortedMessages);
    });

    return () => unsubscribeFunc;
  });


  return (
    <main className="chat-box">
      <div className="messages-wrapper">
        {messages?.map((message) => (
          <>
          <div className={`chat-bubble ${message.uidSender === auth.currentUser.uid ? "right" : ""}`}>
          <img className="chat-bubble__left" src={message.photoSender}/>
          <div className="chat-bubble__right">
            <p className="user-name">{message.nameSender}</p>
            <p className="user-message">{message.msg}</p>
          </div>
        </div>
        </>
        ))}
      </div>
      <SendMessage messageCollection={messageCollection} />
      <div><SignOut /></div>
    </main>
  );
};






const SendMessage = ({ messageCollection }) => {
  const [message, setMessage] = useState('');

  const sendMessage = async (e) => {
    e.preventDefault();

    if (message.trim() === "") {
      alert("Please enter a valid message.");
      return;
    }

    // Send new message (add document to firestore message collection) 
    await firestore.collection(messageCollection).add({
      msg: message,
      uidSender: auth.currentUser.uid,
      nameSender: auth.currentUser.displayName,
      photoSender: auth.currentUser.photoURL,
      sentAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    setMessage("");
  };
  return (
    <form onSubmit={(e) => sendMessage(e)} className="send-message">
      <label htmlFor="messageInput" hidden>
        Enter Message
      </label>
      <input
        id="messageInput"
        name="messageInput"
        type="text"
        className="form-input__input"
        placeholder="Enter your message..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <button type="submit">Send</button>
    </form>
  );
};




























const root = document.getElementById('root');
const rootElement = createRoot(root);

rootElement.render(<App />);

export default App;
