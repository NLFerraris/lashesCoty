// Importamos los módulos necesarios desde el CDN oficial de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import { 
    getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, setDoc, getDoc, query, where, onSnapshot 
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDzrE9yedcqkOAGqPWbiF9YtrmPNwAmFLU",
    authDomain: "lashes-coty.firebaseapp.com",
    projectId: "lashes-coty",
    storageBucket: "lashes-coty.firebasestorage.app",
    messagingSenderId: "539565374444",
    appId: "1:539565374444:web:c56c60a39629c6264e9ec9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, setDoc, getDoc, query, where, onSnapshot };