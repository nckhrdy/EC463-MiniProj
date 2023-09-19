import React, { useState, useEffect } from 'react';
import './App.css';

import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';

import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollectionData } from 'react-firebase-hooks/firestore';

// Import the createRoot() function from react-dom/client
import { createRoot } from 'react-dom/client';
import { CollectionReference, Timestamp, documentId } from 'firebase/firestore';
import { EmailAuthCredential, getAuth, initializeAuth } from 'firebase/auth';

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

// Enable/disable additional debug metrics 
const debugMode = true;


function App() {  
  const [user] = useAuthState(auth);

  return (
    <div className="App">
      <header className="App-header">
        <h1 className="App-title">EC463 Chat Room</h1>
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


// Synchronizes user data within the 'users' collection or adds them if they don't exist
function syncUser() {
  if (auth.currentUser) {
    const currentUser = firestore.collection('users').doc(auth.currentUser.uid).set({
      displayName: auth.currentUser.displayName,
      email: auth.currentUser.email,
      photoURL: auth.currentUser.photoURL,
      lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
      uid: auth.currentUser.uid,
    });
    
    const currentUserEmailRef = firestore.collection('usersEmail').doc(auth.currentUser.email).set({
      uid: auth.currentUser.uid,
      email: auth.currentUser.email,
    });
  }
}

// Fucntion to present debug metrics after login if 'debugMode' is enabled  
function DebugTools() {
  if (debugMode) {
    return (
      <>
      <p>Current User Email: {auth.currentUser.email}</p>
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
  const [conversation, setConversation] = useState('');
  const [msgtodisplay, setMsgtodisplay] = useState('');


  const launchConversation = async (event, currentUID) => {
    event.preventDefault();
    
    // Sanitizes user input before attempting query
    if ((chatWith.trim() === '') || (chatWith.trim() === auth.currentUser.email)) return;

    // Generate and execute query to get user document matching given email 
    const querySnapshot = await firestore.collection('users').where('email', "==", chatWith).get();
    const invalidUserQuery = querySnapshot.empty;

    if (!invalidUserQuery) {
      const userDoc = querySnapshot.docs[0];
      const targetUID = userDoc.data().uid;
      setChatWithUID(targetUID);

      const conversationQuery = await firestore.collection('conversations').where('uidA', 'in', [auth.currentUser.uid, targetUID]).where('uidB', 'in', [auth.currentUser.uid, targetUID]).get();
      const invalidConversationQuery = conversationQuery.empty;

      if (invalidConversationQuery) {
        const storedConverstations = firestore.collection('conversations');
        const newChat = await storedConverstations.add({
          uidA: auth.currentUser.uid,
          uidB: targetUID,
          emailA: auth.currentUser.email,
          emailB: chatWith,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

        // await newChat.set(newChatDoc);
        
        const messages = await newChat.collection('messages').add({
          msg: "Hi there! This is the start of our conversation!",
          uidSender: auth.currentUser.uid,
          uidReceiver: targetUID,
          sentAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Query and find the ID of the conversation between the two users
      const existingConversationQuery = await firestore.collection('conversations').where('uidA', 'in', [auth.currentUser.uid, targetUID]).where('uidB', 'in', [auth.currentUser.uid, targetUID]).get();
      const conversationID = existingConversationQuery.docs[0].id;

      // Query and retrieve the last ten messages in the conversation 
      const messageCollection = "conversations/" + conversationID + "/messages";
      const messagesQuery = await firestore.collection(messageCollection).orderBy('sentAt').limit(10).get();
      const messages = messagesQuery.docs;
      
      // Manually reading the contents of the first message (message[0]) 
      const msg1 = messages[0].get('msg');

      // NOW WE NEED TO PRESENT ALL THE MESSAGES WITH SOME NICE CSS  

      setMsgtodisplay(msg1)
    } else {
      setChatWithUID("N/A");
    }
    

    

    // const existingConversationQuery = await conversationsRef
    // .where('participants', 'array-contains', auth.currentUser.uid)
    // .where('participants', 'array-contains', userUID)
    // .get();

    //const conversationsRef = firestore.collection('conversations');
    
  }

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

        <p>Chatting with email: {chatWith}</p>
        <p>Chatting with uid: {chatWithUID}</p>
        <p>Message: {msgtodisplay}</p>
        <SignOut />
        <DebugTools />
        </>
      </div>
    </>
  );
}






const chatRoomRef = firestore.collection('chatRooms');

function ChatRoom() {  
  const chatRoomRef = firestore.collection('chatRooms'); // Define chatRoomRef here
  const query = chatRoomRef.orderBy('createdAt').limit(25);
  const [chatRooms] = useCollectionData(query, { idField: 'id' });
  const [newMessage, setNewMessage] = useState('');

  const sendMessage = async (e, chatRoomId) => {
    e.preventDefault();

    if (newMessage.trim() === '') return;

    const messageRef = chatRoomRef.doc(chatRoomId).collection('messages');
    
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

        {chatRooms && chatRooms.map(chatRoom => (
          <div key={chatRoom.id}>
            <ChatMessages chatRoom={chatRoom} />
            <form onSubmit={(e) => sendMessage(e, chatRoom.id)}>
              <input
                type="text"
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button type="submit">Send</button>
            </form>
          </div>
        ))}
      </div>
    </>
  );
}

function ChatMessages({ chatRoom }) {
  const messageRef = chatRoomRef.doc(chatRoom.id).collection('messages');
  const query = messageRef.orderBy('createdAt').limit(25);
  const [messages] = useCollectionData(query, { idField: 'id' });

  return (
    <div>
      {messages && messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
    </div>
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