import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCR-AJmMjiv_uJ0SX0IiKi4Id4cGIEU4Nc",
  authDomain: "capstone-0000-b96ab.firebaseapp.com",
  databaseURL: "https://capstone-0000-b96ab-default-rtdb.firebaseio.com",
  projectId: "capstone-0000-b96ab",
  storageBucket: "capstone-0000-b96ab.appspot.com",
  messagingSenderId: "974834763203",
  appId: "1:974834763203:web:6007a91d80c415d0542976"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const storage = getStorage(app);
const auth = getAuth(app);

export { app, database, storage, auth };
