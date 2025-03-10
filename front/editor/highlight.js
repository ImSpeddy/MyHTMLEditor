const { highlight } = require('highlight.js')

module.exports = (code, filename) => {
    if(filename.endsWith(".js")){
        return highlight(code, {language: "javascript"}).value
    }else{
        return code;
    }
}