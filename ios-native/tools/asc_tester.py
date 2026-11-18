import os,base64,time,jwt,requests,json
key=base64.b64decode(os.environ["P8"]).decode()
tok=jwt.encode({"iss":os.environ["ISS"],"iat":int(time.time()),"exp":int(time.time())+1100,"aud":"appstoreconnect-v1"},key,algorithm="ES256",headers={"kid":os.environ["KID"]})
H={"Authorization":"Bearer "+tok,"Content-Type":"application/json"}
B="https://api.appstoreconnect.apple.com"; APP="6823568988"
def g(p):
    r=requests.get(B+p,headers=H); print("GET",p,r.status_code); return r.json()
def po(p,j):
    r=requests.post(B+p,headers=H,json=j); print("POST",p,r.status_code,r.text[:400]); return r
for b in g("/v1/builds?filter[app]=%s&limit=10&sort=-uploadedDate"%APP).get("data",[]):
    a=b["attributes"]; print("BUILD",b["id"],a["version"],a["processingState"],a.get("expired"),a["uploadedDate"])
us=g("/v1/users?limit=50").get("data",[])
for u in us: print("USER",u["attributes"]["username"],u["attributes"]["roles"])
gs=g("/v1/apps/%s/betaGroups?limit=50"%APP).get("data",[])
for x in gs: print("GROUP",x["id"],x["attributes"]["name"],x["attributes"]["isInternalGroup"],x["attributes"].get("hasAccessToAllBuilds"))
grp=None
for x in gs:
    if x["attributes"]["isInternalGroup"]: grp=x["id"]
if not grp:
    r=po("/v1/betaGroups",{"data":{"type":"betaGroups","attributes":{"name":"Ilse internal","isInternalGroup":True,"hasAccessToAllBuilds":True,"publicLinkEnabled":False},"relationships":{"app":{"data":{"type":"apps","id":APP}}}}})
    if r.status_code<300: grp=r.json()["data"]["id"]
print("group",grp)
em="placenciailse@gmail.com"
ts=g("/v1/betaTesters?filter[email]=%s&limit=5"%em).get("data",[])
print("TESTERS",[(t["id"],t["attributes"]["state"]) for t in ts])
if grp:
    if ts:
        po("/v1/betaGroups/%s/relationships/betaTesters"%grp,{"data":[{"type":"betaTesters","id":ts[0]["id"]}]})
    else:
        po("/v1/betaTesters",{"data":{"type":"betaTesters","attributes":{"email":em,"firstName":"Ilse","lastName":"Placencia"},"relationships":{"betaGroups":{"data":[{"type":"betaGroups","id":grp}]}}}})
