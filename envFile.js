const fs = require("fs");

class EnvFile {
    constructor(env) {
      this.env = env;
      this.rawContents = fs.readFileSync(`.env.${env}`, "utf8");
      // this.jsonContent = convertRawDotenvToJson(this.rawContents);
    }

    getEnv() {
        return this.env;
    }
  
    getJsonContent() {
      const jsonContent = {};
      this.rawContents.split("\n").forEach(line => {
        if (line.startsWith("#") || !line.includes("=")) return;
  
        const [varName, value] = line.split("=")
        jsonContent[varName] = value;
      });
  
      return jsonContent;
    }

    injectChanges(newJsonContent) {
        const newRawContents = this.rawContents.split("\n").map(line => {
            if (line.startsWith("#") || !line.includes("=")) return line;

            const [varName, ] = line.split("=");
            
            if (varName in newJsonContent) {
                 // return varName with new value
                 return `${varName}=${newJsonContent[varName]}`;
            } else {
                // these get removed in the next step
                return line;
            }
        }).filter(line => {
            // if line is a comment, or another non-variable declaring line, keep it in the env file
            if (line.startsWith("#") || !line.includes("=")) return true;

            const [varName, ] = line.split("=");

            return varName in newJsonContent;
        });

        const oldFields = Object.keys(this.getJsonContent());
        
        // array of net-new fields added
        const newFields = Object.keys(newJsonContent).filter(key => !oldFields.includes(key));
        newRawContents.push(...newFields.map(key => `${key}=${newJsonContent[key]}`));

        this.rawContents = newRawContents.join("\n");
    }

    save() {
        if (this.rawContents.includes('Generated by Dotenv CLI Manager on ')) {
            this.rawContents = this.rawContents.replace(/Generated by Dotenv CLI Manager on .*$/, `Generated by Dotenv CLI Manager on ${new Date()}`);
        }
        else {
            this.rawContents = `# Generated by Dotenv CLI Manager on ${new Date()}\n\n${this.rawContents}`;
        }
    
        fs.writeFileSync(`.env.${this.getEnv()}`, this.rawContents);
    }
  
  }

module.exports = EnvFile;