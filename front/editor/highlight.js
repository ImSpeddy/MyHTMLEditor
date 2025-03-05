const highlights1 = require("./highlights/highlights1.json")
const highlights2 = require("./highlights/highlights2.json")
const highlights3 = require("./highlights/highlights3.json")
const highlights4 = require("./highlights/highlights4.json")

module.exports = (code) => {
    let fragmentatedCode = ""
    let arrayedCode = code.split(" ")

    arrayedCode.forEach((e, i)=>{
        highlights1.forEach(he =>{
            if(e.toUpperCase() === he){
                // Handle case, paint red
                arrayedCode[i] = `<span style=\"color:rgb(255, 64, 64)\">${e}</span>`
            }
        })
        highlights2.forEach(he =>{
            if(e.toUpperCase() === he){
                // Handle case, paint green
                arrayedCode[i] = `<span style=\"color:rgb(64, 255, 64)\">${e}</span>`
            }
        })
        highlights3.forEach(he =>{
            if(e.toUpperCase() === he){
                // Handle case, paint blue
                arrayedCode[i] = `<span style=\"color:rgb(64, 64, 255)\">${e}</span>`
            }
        })
        highlights4.forEach(he =>{
            if(e.toUpperCase() === he){
                // Handle case, paint yellow
                arrayedCode[i] = `<span style=\"color:rgb(255, 255, 64)\">${e}</span>`
            }
        })
    })

    fragmentatedCode = arrayedCode.join(" ")
    return fragmentatedCode
}