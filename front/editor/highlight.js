module.exports = (code, filename) => {
    if(filename.endsWith(".js")){
        const highlights1 = require("./highlights/js/highlights1.json")
        const highlights2 = require("./highlights/js/highlights2.json")
        const highlights3 = require("./highlights/js/highlights3.json")
        const highlights4 = require("./highlights/js/highlights4.json")
        const highlights5 = require("./highlights/js/highlights5.json")

        let fragmentatedCode = ""
        let arrayedCode = code.split(" ")

        arrayedCode.forEach((e, i)=>{
            highlights1.forEach(he =>{
                if(e.toUpperCase() === he.keyword){
                    // Handle case, paint red
                    arrayedCode[i] = `<span style=\"color:rgb(255, 64, 64)\">${e}</span>`
                    if(he.type === "declaration"){
                        arrayedCode[i + 1] = `<span style=\"color:rgb(255, 255, 128)\">${arrayedCode[i + 1]}</span>`
                    }
                }
            })
            highlights2.forEach(he =>{
                if(e.toUpperCase() === he.keyword){
                    // Handle case, paint green
                    arrayedCode[i] = `<span style=\"color:rgb(64, 255, 64)\">${e}</span>`
                }
            })
            highlights3.forEach(he =>{
                if(e.toUpperCase() === he.keyword){
                    // Handle case, paint blue
                    arrayedCode[i] = `<span style=\"color:rgb(64, 64, 255)\">${e}</span>`
                }
            })
            highlights4.forEach(he =>{
                if(e.toUpperCase() === he.keyword){
                    // Handle case, paint yellow
                    arrayedCode[i] = `<span style=\"color:rgb(255, 255, 64)\">${e}</span>`
                }
            })
            highlights5.forEach(he =>{
                if(e.toUpperCase() === he.keyword){
                    // Handle case, paint yellow
                    arrayedCode[i] = `<span style=\"color:rgb(86, 86, 86)\">${e}</span>`
                    if(he.type === "comment1"){
                        for (let index = 0; arrayedCode[i + index].includes("\n") == false; index++) {
                            arrayedCode[i + index] = `<span style=\"color:rgb(86, 86, 86)\">${arrayedCode[i+index]}</span>`
                        }
                    }
                }
            })
            
        })
    
        fragmentatedCode = arrayedCode.join(" ")
        return fragmentatedCode
    }else{
        return code;
    }
}