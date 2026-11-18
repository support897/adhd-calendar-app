import os,base64,time,jwt,requests
key=base64.b64decode(os.environ["P8"]).decode()
tok=jwt.encode({"iss":os.environ["ISS"],"iat":int(time.time()),"exp":int(time.time())+1100,"aud":"appstoreconnect-v1"},key,algorithm="ES256",headers={"kid":os.environ["KID"]})
H={"Authorization":"Bearer "+tok,"Content-Type":"application/json"}
B="https://api.appstoreconnect.apple.com"; APP="6823568988"
G="0e17d4c5-357c-4030-b94b-80e719affc11"
r=requests.get(B+"/v1/builds?filter[app]=%s&limit=3&sort=-uploadedDate"%APP,headers=H)
for b in r.json()["data"]:
    v=b["attributes"]["version"]
    r1=requests.patch(B+"/v1/builds/"+b["id"],headers=H,json={"data":{"type":"builds","id":b["id"],"attributes":{"usesNonExemptEncryption":False}}})
    print("ENC",v,r1.status_code,r1.text[:200])
    r2=requests.post(B+"/v1/betaGroups/%s/relationships/builds"%G,headers=H,json={"data":[{"type":"builds","id":b["id"]}]})
    print("ADD",v,r2.status_code,r2.text[:200])
    r3=requests.get(B+"/v1/builds/%s/buildBetaDetail"%b["id"],headers=H)
    print("BETA",v,r3.json().get("data",{}).get("attributes"))
