const express = require("express");
const app = express();
const PORT = 3000;

app.get("/api/home", (req, res)=> {
    res.json({message: "Hello world!"});
});

app.listen(PORT, () =>{
    console.log(`Server up on port: ${PORT}`);
})