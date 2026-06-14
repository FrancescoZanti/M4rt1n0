import { LogLevel } from "@azure/msal-browser";
import type { Configuration } from "@azure/msal-browser";

export const msalConfig: Configuration = {
    auth: {
        clientId: "11111111-2222-3333-4444-555555555555", // Inserisci qui il tuo Client ID
        authority: "https://login.microsoftonline.com/common", // Oppure l'ID del tuo Tenant
        redirectUri: "/", 
        postLogoutRedirectUri: "/"
    },
    cache: {
        cacheLocation: "sessionStorage", // 'sessionStorage' o 'localStorage'
    },
    system: {	
        loggerOptions: {	
            loggerCallback: (level, message, containsPii) => {	
                if (containsPii) {		
                    return;		
                }		
                switch (level) {
                    case LogLevel.Error:
                        console.error(message);
                        return;
                    case LogLevel.Info:
                        // console.info(message);
                        return;
                    case LogLevel.Verbose:
                        console.debug(message);
                        return;
                    case LogLevel.Warning:
                        console.warn(message);
                        return;
                }	
            }	
        }	
    }
};

export const loginRequest = {
    scopes: ["User.Read"]
};
