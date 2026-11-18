import os,base64,time,jwt,requests
key=base64.b64decode(os.environ["P8"]).decode()
tok=jwt.encode({"iss":os.environ["ISS"],"iat":int(time.time()),"exp":int(time.time())+1100,"aud":"appstoreconnect-v1"},key,algorithm="ES256",headers={"kid":os.environ["KID"]})
H={"Authorization":"Bearer "+tok,"Content-Type":"application/json"}
B="https://api.appstoreconnect.apple.com"; APP="6823568988"
G="0e17d4c5-357c-4030-b94b-80e719affc11"
r=requests.patch(B+"/v1/betaGroups/"+G,headers=H,json={"data":{"type":"betaGroups","id":G,"attributes":{"hasAccessToAllBuilds":True,"feedbackEnabled":True}}})
print("PATCH group",r.status_code,r.text[:300])
r=requests.get(B+"/v1/betaGroups/%s/betaTesters?limit=50"%G,headers=H)
print("MEMBERS",[(t["attributes"]["email"],t["attributes"]["state"]) for t in r.json().get("data",[])])
r=requests.get(B+"/v1/betaGroups/%s?include=builds&limit[builds]=5"%G,headers=H)
print("GROUPBUILDS",[(b["attributes"]["version"]) for b in r.json().get("included",[])])
r=requests.get(B+"/v1/builds?filter[app]=%s&limit=3&sort=-uploadedDate"%APP,headers=H)
for b in r.json()["data"]:
    r2=requests.get(B+"/v1/builds/%s/buildBetaDetail"%b["id"],headers=H)
    print("BETA",b["attributes"]["version"],r2.json().get("data",{}).get("attributes"))
