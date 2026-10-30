ostokset = []
while True:
    rivi = input()
    if rivi == "":
        break
    ostokset.append(rivi)
print(f"Ostoksia: {len(ostokset)}")
for i in range(len(ostokset)):
    print(f"{i + 1}. {ostokset[i]}")
