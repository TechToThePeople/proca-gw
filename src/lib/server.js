const fetch = require("node-fetch");

async function graphQL (operation, query, options) {
  if (!options) options = {};
  if (!options.apiUrl) options.apiUrl = process.env.REACT_APP_API_URL || process.env.API_URL;

  let data = null;
  let headers = {
      "Content-Type": "application/json",
      Accept: "application/json"
  };
  if (options.authorization) {
//    var auth = 'Basic ' + Buffer.from(options.authorization.username + ':' + options.authorization.username.password).toString('base64');
    headers.Authorization = 'Basic '+options.authorization;
  }
  await fetch(process.env.REACT_APP_API_URL || process.env.API_URL, {
    method: "POST",
    headers: headers,
    body: JSON.stringify({
      query:query,
      variables: options.variables,
      operationName: operation || "missing"
    })
  })
  .then (res => {
    if (!res.ok) {
      return {errors:[{message:res.statusText,code: "http_error",status:res.status}]};
    }
    return res.json();
  }).then (response => {
    if (response.errors) {
      response.errors.forEach( (error) => console.log(error.message));
      return;
    }
    data = response.data;
  }).catch(error =>{
    console.log(error);
    return;
  });
  return data;
}

async function getWidgetConfig(actionPage) {
  const query = 
`query getActionPage($id:ID!) {
  actionPage(id: $id) {
    config,id,locale,org {
      title
    },url,campaign {
      id,name,title
    }
  }
}`;
  const data = await graphQL ("getActionPage",query,{variables:{ id: Number(actionPage) }});
// if (!data) return null;
 const defaultConfig =  {
  "lang":"EN",
  "filename":"page-"+actionPage,
  "organisation":"Organisation name",
  "journey":["petition","share"],
  "component": {},
  "locales":{},
  };

 let r ={actionPage:actionPage,
   lang:data.actionPage.locale.toUpperCase(),
   organisation:data.actionPage.org.title.toLowerCase()};//TODO: fetch org.name once implemented
 //let config= (...defaultConfig,...r,...(data.config));
 let config= Object.assign(defaultConfig,r,JSON.parse(data.actionPage.config));
 return config;
}


async function getCount(actionPage) {
  var query = 
`query getCount($actionPage: ID!)
{actionPage(id:$actionPage) {
  campaign {
    stats {
      signatureCount
    }
  }
}}
`;
// ah? it can be a get call api?query=query getCount($id:ID!){actionPage(id:$id){campaign{stats{signatureCount }}}}&variables={"id":1}
 const data = await graphQL ("getCount",query,{variables:{ actionPage: Number(actionPage) }});
 if (!data) return null;
 return data.actionPage.campaign.stats.signatureCount;
}

async function getSignature(organisation,campaign,options) {
  var query = 
`query getSignatures($campaign: ID!,$organisation:String!,$limit: Int)
{
org(name: $organisation) {
  id, campaigns { id, name },
  signatures(campaign_id: $campaign, limit: $limit) {
    public_key, 
    list {
      id, created,
      contact, nonce     }
  }
}
}
`;
 const data = await graphQL ("getSignatures",query,{variables:{ campaign: Number(campaign), organisation:organisation,limit:options.limit || 10}, authorization:options.authorization });
 if (!data) return null;
 return data;
}


async function addSignature(data) {
  var query = `
mutation push($action: SignatureExtraInput,
  $contact:ContactInput,
  $privacy:ConsentInput,
  $tracking:TrackingInput
){
  addSignature(actionPageId: data.actionPage, 
    action: $action,
    contact:$contact,
    privacy:$privacy,
    tracking:$tracking
  )}
`;

  let variables = {
    action: {
      comment: data.comment
    },
    contact: {
      first_name: data.firstname,
      last_name: data.lastname,
      email: data.email,
      address: {
        country: data.country || "",
        postcode: data.postcode || ""
      }
    },
    privacy: { optIn: data.privacy === "opt-in" }
  };
  if (Object.keys(data.tracking).length) {
    variables.tracking = data.tracking;
  }

 const data = await graphQL ("addSignature",query,{variables:variables});
 if (!data) return null;
 return data;
}

module.exports = {
  addSignature:addSignature,
  getSignature:getSignature,
  getCount:getCount,
  getWidgetConfig: getWidgetConfig
};
