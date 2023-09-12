import logo from './logo.svg';
import React from 'react';
import './App.css';

import firbase, { FirebaseError } from 'firebase/app';
import 'firebase/firestore';
import 'firebase/auth';

import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollectionData } from 'react-firebase-hooks/firestore';

firbase.initializeApp({
  apiKey: "AIzaSyA9UXiRdS6R81U0A5uVxlevx8lgKTkiU9k",
  authDomain: "ec463-miniproj-398821.firebaseapp.com",
  projectId: "ec463-miniproj-398821",
  storageBucket: "ec463-miniproj-398821.appspot.com",
  messagingSenderId: "365913955596",
  appId: "1:365913955596:web:a6e6533bb7571a6fc67d29",
  measurementId: "G-YDRT69HKK3"
})

const auth = firbase.auth();
const firestore = firbase.firestore();

function App() {
  return (
    <div className="App">
      <header className="App-header">
      </header>
    </div>
  );
}

export default App;
