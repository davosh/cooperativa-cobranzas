const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxdQkSB6p4AiVIQv9HtbLy6DFNdbe_hU-VkY7d0u9OTfR3qA4GCgKclUplDk1uvdaPs/exec';
const SECRET_TOKEN = 'ECUACREDITOS_AGENCIA_IBARRA_2026_SECURE_KEY';

const firebaseConfig = {
    apiKey: "AIzaSyA0ozR5CVjVkZk43frHrKwaXj0NzXfBaks",
    authDomain: "cooperativa-cobranzas.firebaseapp.com",
    databaseURL: "https://cooperativa-cobranzas-default-rtdb.firebaseio.com",
    projectId: "cooperativa-cobranzas",
    storageBucket: "cooperativa-cobranzas.firebasestorage.app",
    messagingSenderId: "873818847631",
    appId: "1:873818847631:web:d6dae162c3a100bfb373fa",
    measurementId: "G-43D3M4TX5H"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

let credits = [];
let gestiones = {};
let compromisos = {};
let cobros = {};