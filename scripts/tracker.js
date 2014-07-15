// Firebase base URL and nodes that contain Bug info
var baseURL = "https://ffosbackup.firebaseio.com/";
window.addEventListener('load', init);

var logeado = false;
var sync = false;
var myUserId;
var userfb;
var contactsfb;
var localPeople;
var remotePeople;

function init() {
  createMainMenu(); 
  initLocalList();
  window.navigator.mozContacts.oncontactchange = localContactChanged;
}  

function createMainMenu()
{
   var wrapper= document.createElement('div');
   wrapper.setAttribute("id", "index");
   content = "<div><a id='login'>";
   content += "<div class='versionbox bg-color-orangeDark'><h3 class='font-color-white'>Login & Sync</h3></div>";
   content += "</a></div>";
   content += "<div><div class='title'>Local Contacts</div><div class='title'>Remote Contacts</div></div>"
   content += "<div><div class='contactlist'><ul id='localpeople'></ul></div><div class='contactlist'><ul id='remotepeople'></ul></div></div>"
   wrapper.innerHTML = content;
   document.getElementById("page-index").appendChild(wrapper);

   localPeople = document.getElementById("localpeople");
   remotePeople = document.getElementById("remotepeople");
   var hrlogin = document.getElementById("login");
   hrlogin.onclick = login;
}

function initLocalList(){
  console.log("initLocalList: BEGIN METHOD")
  var allContacts = window.navigator.mozContacts.getAll({sortBy: "familyName", sortOrder: "descending"});
  allContacts.onsuccess = function(event) {
    var cursor = event.target;
    if (cursor.result) {
      console.log("initLocalList: contact to add locally " + cursor.result.id + " - " + cursor.result.name)
      addItemToContactList("local-"+cursor.result.id, cursor.result.name, localPeople)
      cursor.continue();
    } 
  };
  console.log("initLocalList: END METHOD")
}

function login()
{
  console.log("login: BEGIN METHOD")
  fbref = new Firebase(baseURL);
  var auth = new FirebaseSimpleLogin(fbref, createLoginCallback())
  auth.login('google');
  console.log("login: END METHOD")
}

// Closure for adding listeners to every node
function createLoginCallback()
{
  return function(error, user){
    console.log("loginCallback: BEGIN METHOD")
    if (error) {
      console.log("loginCallback: *** ERROR *** Login Failed! " + error + " ****");
    } else if (user) {// user authenticated with Firebase
      console.log('loginCallback: *** SUCCESSS *** User Email: ' + user.email + ' Provider: ' + user.provider + " ID: " + user.id);
      if (logeado == false) {
        // inits
        logeado = true;
        myUserId = user.id;
        sync=true;
        userfb = new Firebase(baseURL + "/users/" + user.id);
        contactsfb = new Firebase(baseURL + "/users/" + user.id + "/contacts")

        // Copy basic user data to FB
        var childRef = userfb.child('/id');
        childRef.set(user.id);
        childRef = userfb.child('/email');
        childRef.set(user.email);

        var allContacts = window.navigator.mozContacts.getAll({sortBy: "familyName", sortOrder: "descending"});
        allContacts.onsuccess = function(event) {
          var cursor = event.target;
          if (cursor.result) {
            console.log("loginCallback: contact to add " + cursor.result.id + " " + cursor.result.name + " " + JSON.stringify(cursor.result))
            addItemToContactList(cursor.result.id, cursor.result.name, remotePeople)
            console.log("loginCallback: contact to add " + cursor.result.id + " " + document.getElementById(cursor.result.id).innerHTML + " " + JSON.stringify(cursor.result))
            updateFBContact(cursor.result.id, document.getElementById(cursor.result.id).innerHTML, JSON.stringify(cursor.result))
            cursor.continue();
          }
        };
        // Read once all Firebase data
        contactsfb.once('value', fbContactsRead);
      }
    } else {
      console.log("*** USER logged out");
    } 
  }
}

function fbContactsRead(snapshot) {
  console.log("fbContactsRead: BEGIN METHOD AKA ONCE")
  snapshot.forEach(function(childSnapshot) {
    console.log("fbContactsRead: FB Item with ID " + childSnapshot.val().id + " and...: ")
    console.log(childSnapshot.val());
    // Show, if available DOM element modify innerHTML if not, add new one
    var item = document.getElementById(childSnapshot.val().id);
    addItemToContactList(childSnapshot.val().id, childSnapshot.val().name, remotePeople);

    var options = {
      filterBy: ['id'],
      filterOp: 'equals',
      filterValue: childSnapshot.val().id 
    };
    var request = navigator.mozContacts.find(options);

    request.onsuccess = function(e) {
      if (e.target.result[0] != undefined) {
        console.log("fbContactsRead: The FB contact is already in the local DB " + e.target.result[0] + " " + childSnapshot.val().id);
        if (JSON.stringify(e.target.result[0]) == childSnapshot.val().contact ) {
          console.log("fbContactsRead: Local and FB contacts are exactly the same");
        } else {
          console.log("fbContactsRead: Both contacts are different");
          console.log("fbContactsRead: Local  " + JSON.stringify(e.target.result[0]));
          console.log("fbContactsRead: Remote " + childSnapshot.val().contact);
          if (sync) {
            //e.target.result[0].name = childSnapshot.val().name;
            //request = window.navigator.mozContacts.save(new mozContact(JSON.parse(childSnapshot.val().contact)));
            saveoperation = window.navigator.mozContacts.save(e.target.result[0]);
            saveoperation.onsuccess = function(){
              console.log("fbContactsRead: Local ID after updating the contact is " + e.target.result[0].id);
            }
          }
        }          
      } else {
        console.log("fbContacsRead: The FB contact is not in the Local DB");
        myContact = new mozContact(JSON.parse(childSnapshot.val().contact))
        var oldId = childSnapshot.val().id;
        console.log("fbContacsRead: The old ID is " + oldId);
        saveoperation = window.navigator.mozContacts.save(myContact);
        saveoperation.onsuccess = function(){
          console.log("fbContactsRead: Local ID after updating the contact is " + myContact.id);
          addItemToContactList("local-"+myContact.id, myContact.name, localPeople);
          var fb = new Firebase(baseURL + "/users/" + myUserId + "/contacts/" + oldId);
          console.log("fbContacsRead: asking for removeal " + baseURL + "/users/" + myUserId + "/contacts/" + oldId)
          fb.remove();
          var element = document.getElementById(oldId);
          if (element != null) 
            element.parentNode.removeChild(element);
          console.log("fbContacsRead: removal asked ")
        }
      }
    }; 

    request.onerror = function(e) {
      console.log("fbContacsRead: The FB contact is not in the Local DB");
      saveoperation = window.navigator.mozContacts.save(new mozContact(JSON.parse(childSnapshot.val().contact)));
      saveoperation.onsuccess = function(){
        console.log("fbContactsRead: Local ID after updating the contact is " + e.target.result[0].id);
        addItemToContactList("local-"+e.target.result[0].id, e.target.result[0].name, localPeople);
      }
    }; 
  });
  contactsfb.on('child_removed', contactRemoved);
  contactsfb.on('child_added', contactAdded);
  //contactsfb.on('child_changed', fbContactChanged);
}

function addItemToContactList(id, name, list)
{
  if (document.getElementById(id) == null){
    var listItem = document.createElement('li');
    listItem.setAttribute("id", id);
    listItem.innerHTML = name;
    list.appendChild(listItem);
  }
}

function contactRemoved(oldChildSnapshot) {
  console.log(" +++ ON +++ child_removed " + oldChildSnapshot.val().id);
  var element = document.getElementById(oldChildSnapshot.val().id);
  if (element != null) 
    element.parentNode.removeChild(element);
 
  if (sync && (document.getElementById("local-"+oldChildSnapshot.val().id) != null)) {
    var element = document.getElementById("local-"+oldChildSnapshot.val().id);
    if (element != null) 
      element.parentNode.removeChild(element);
    var options = {
      filterBy: ['id'],
      filterOp: 'equals',
      filterValue: oldChildSnapshot.val().id 
    };
    var request = navigator.mozContacts.find(options);

     request.onsuccess = function(e) {
       console.log("EL CONTACTO TODAVIA EXISTE EN LOCAL");
       request = window.navigator.mozContacts.remove(e.target.result[0]);
    }; 
  }
}

function fbContactChanged(childSnapshot, prevChildName) {
  console.log("fbContactChanged: BEGIN Firebase");
  console.log(childSnapshot.val());
  if (childSnapshot.val().id != undefined)
  {
    var item = document.getElementById(childSnapshot.val().id);
    if (item != null) { // should happen
      if (childSnapshot.val().name != undefined)
        item.innerHTML = childSnapshot.val().name;
      if ( childSnapshot.val().contact != undefined)
      {
        var options = {
            filterBy: ['id'],
            filterOp: 'equals',
            filterValue: childSnapshot.val().id 
        };
        var request = navigator.mozContacts.find(options);

        request.onsuccess = function(e) {
          if (JSON.stringify(e.target.result[0]) == childSnapshot.val().contact )
          {
            console.log("Y ES IGUAL");
          } else {
            console.log("PERO ES DISTINTO ");
            console.log("LOCAL  " + JSON.stringify(e.target.result[0]));
            console.log("REMOTO " + childSnapshot.val().contact);
            if (sync)
            {
              console.log("hay que probar esto")
              //e.target.result[0].name = childSnapshot.val().name;
              request = window.navigator.mozContacts.save(new mozContact(JSON.parse(childSnapshot.val().contact)));
              //request = window.navigator.mozContacts.save(e.target.result[0]);
            }
            // FALLA, crea uno nuevo aun cuando el ID sea el mismo :(
            //request = window.navigator.mozContacts.save(new mozContact(JSON.parse(childSnapshot.val().contact)));
            // PROBAR WORKAROUND BORRAR Y CREAR :()
          }
        }; 
      } 
    } else { //shouldnt happen
      addItemToContactList(childSnapshot.val().id, childSnapshot.val().name, remotePeople)
    }
  }
  console.log("fbContactChanged: END Firebase");
}

// TODO - como lo primero que se crea es contact, parsear y ver id y name para con eso ya decidir que hacer, porque id viene undefined
function contactAdded(childSnapshot, prevChildName) {
  console.log(" +++ ON +++ child_added");
  console.log(childSnapshot.val());
  var contact = JSON.parse(childSnapshot.val().contact)

  if (childSnapshot.val().contact != undefined){
    localId   == contact.id; 
    localName == contact.name; 
  }
  else{
    if (childSnapshot.val().id != undefined)
      localId = childSnapshot.val().id;
    if (childSnapshot.val().name != undefined)
      locaName = childSnapshot.val().name;
  }


  // Add to remote list
  addItemToContactList(localId, localName, remotePeople)

  // Now let's check if contact exists
  var options = {
      filterBy: ['id'],
      filterOp: 'equals',
      filterValue: localId 
  };
  var request = navigator.mozContacts.find(options);

  if (sync){
    request.onsuccess = function(e) {
      if (e.target.result[0] != undefined) {
        console.log("contactAdded: The FB contact is already in the local DB " + e.target.result[0] + " " + localId);
        if (JSON.stringify(e.target.result[0]) == childSnapshot.val().contact ) {
          console.log("contactAdded: Local and FB contacts are exactly the same");
        } else {
          console.log("contactAdded: Both contacts are different");
          console.log("contactAdded: Local  " + JSON.stringify(e.target.result[0]));
          console.log("contactAdded: Remote " + childSnapshot.val().contact);
          e.target.result[0].name = localName;
          saveoperation = window.navigator.mozContacts.save(e.target.result[0]);
          saveoperation.onsuccess = function(){
            console.log("fbContactsRead: Local ID after updating the contact is " + e.target.result[0].id);
            // Deberíamos borrar el antiguo tanto de FB como local?
          }
        }          
      } else {
        console.log("fbContacsRead: The FB contact is not in the Local DB");
        myContact = new mozContact(JSON.parse(childSnapshot.val().contact))
        var oldId = localId;
        console.log("fbContacsRead: The old ID is " + oldId);
        saveoperation = window.navigator.mozContacts.save(myContact);
        saveoperation.onsuccess = function(){
          console.log("fbContactsRead: Local ID after updating the contact is " + myContact.id);
          addItemToContactList("local-"+myContact.id, myContact.name, localPeople);
          var fb = new Firebase(baseURL + "/users/" + myUserId + "/contacts/" + oldId);
          console.log("fbContacsRead: asking for removeal " + baseURL + "/users/" + myUserId + "/contacts/" + oldId)
          fb.remove();
          var element = document.getElementById(oldId);
          if (element != null) 
            element.parentNode.removeChild(element);
          console.log("fbContacsRead: removal asked ")
        }
      }
    }; 
  }
}

// Used to check if a contact has changed in the Local Database
function localContactChanged(event)
{
  console.log("eventContactChanged " + event.reason + " - " + event.contactID)
  if (event.reason == "create") {
      var options = {
        filterBy: ['id'],
        filterOp: 'equals',
        filterValue: event.contactID 
      };
      var request = navigator.mozContacts.find(options);

      request.onsuccess = function(e) {
         addItemToContactList("local-"+event.contactID, e.target.result[0].name, localPeople)

         if ((sync) && (document.getElementById(event.contactID) == null)) 
         {
           addItemToContactList(event.contactID, e.target.result[0].name, remotePeople)
           updateFBContact(event.contactID, document.getElementById("local-"+event.contactID).innerHTML, JSON.stringify(e.target.result[0]))
         }
      }; 
  } else if (event.reason == "remove"){
    var element = document.getElementById("local-" + event.contactID);
    if (element != null)
      element.parentNode.removeChild(element);
    if ((sync) && (document.getElementById(event.contactID) != null)) {
      el = document.getElementById(event.contactID);
      el.parentNode.removeChild(el);
      var fb = new Firebase(baseURL + "/users/" + myUserId + "/contacts/" + event.contactID);
      fb.remove();
    }
  } else if (event.reason == "update"){
    var element = document.getElementById("local-" + event.contactID);
    if (element != null)
    {  
      var options = {
            filterBy: ['id'],
            filterOp: 'equals',
            filterValue: event.contactID 
      };
      var request = navigator.mozContacts.find(options);

      request.onsuccess = function(e) {
        element.innerHTML = e.target.result[0].name;
        if ((sync) && (document.getElementById(event.contactID) != null)) {
          var fb = new Firebase(baseURL + "/users/" + myUserId + "/contacts/" + event.contactID);
          fb.once('value', function (snapshot){
            if (snapshot.val().contact != JSON.stringify(e.target.result[0])) {
              console.log("contact just stored is different to FB one");
              addItemToContactList(event.contactID, e.target.result[0].name, remotePeople)
              updateFBContact(event.contactID, element.innerHTML, JSON.stringify(e.target.result[0]))
            }
            else {
              console.log("contact just stored is equal to FB one");
            }
          });
        }
      }; 
    }
  }
}

function updateFBContact(id, name, contact)
{
  childRef = userfb.child('contacts/'+ id + '/contact');
  childRef.set(contact);
  var childRef = userfb.child('contacts/'+ id + '/name');
  childRef.set(name);
  childRef = userfb.child('contacts/'+ id + '/id');
  childRef.set(id);
}

