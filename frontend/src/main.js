import { BACKEND_PORT } from './config.js';
// A helper you may want to use when uploading new images to the server.
import { fileToDataUrl, apiCallFn, showAlert, closeAlert } from './helpers.js';


const apiCallGet = apiCallFn('GET');
const apiCallPost = apiCallFn('POST');
const apiCallPut = apiCallFn('PUT');
const apiCallDelete = apiCallFn('DELETE');

let globalToken = null;
let globalUserId = null; 					// record current user
let channelIds = []; 						// record existing channelIds
let globalChannelId = null;					// record current channelId


const inviteMembers = (channel)=>{
	// fetch all users and only list who are not in this channel (channel.members)
	const dropdownContainer = document.getElementById('userDropdownContainer');
	const usersDropdown = document.getElementById('usersDropdown');
	dropdownContainer.style.display = 'none';

	console.log(`channelID: ${channel.id}`);
	apiCallGet('user', {}, true, globalToken)
	.then(body => {
		const userArr = body.users;
		while (usersDropdown.firstChild) {
			usersDropdown.removeChild(usersDropdown.firstChild);
		}
		userArr.forEach(user => {
			if(! channel.members.includes(user.id)) {
				const userid = user.id;
				apiCallGet(`user/${user.id}`, {}, true, globalToken) 
				.then( user => {
					let option = document.createElement('option');
					option.value = userid;
					option.textContent = user.name;
					usersDropdown.appendChild(option);
				})
			}
		});
	})
	.catch(error => showAlert(error));
	document.getElementById(`addUserButton-${channel.id}`).onclick = () => {
		if (dropdownContainer.style.display === 'none') {
			dropdownContainer.style.display = 'block';
		} else {
			dropdownContainer.style.display = 'none';
			showpage('dashboard-channels');
		}
		if (usersDropdown.options.length === 0) {
			dropdownContainer.style.display = 'none';
			showAlert('all users have joined this channel');
			console.log(`channel members: ${channel.members}`);
		}

		for (let i = 0; i < usersDropdown.options.length; i++) {
			const option = usersDropdown.options[i];
			if (option.selected) {
				// invite
				apiCallPost(`channel/${channel.id}/invite`, {userId: parseInt(option.value)}, true, globalToken)
				.then(body => {
					console.log(body);
					option.selected = false;	// reset
				})
				.catch(error => showAlert(error));
			}
		}
		loadMessages(channel);
	};
} 

const messageBoxDesign = (message, pin=false) => {
	// the sender's name and profile photo, and message timestamp 
	const messageBox = document.createElement('div');
	const profileImg = document.createElement('img');
	profileImg.classList.add('profileImg');

	const senderSpan = document.createElement('span');
	const timeSpan = document.createElement('span');
	const actionList = ['delete', 'edit', 'pin'];
	for (let i = 0; i < actionList.length; i++) {
		const actionBtn = document.createElement('a');
		actionBtn.innerText = actionList[i];
		actionBtn.style.float = 'right';
		actionBtn.style.paddingLeft = '0.8rem';
		actionBtn.style.textDecoration = 'underline';
		if (pin) {
			actionBtn.style.display = 'none';
		} else {
			actionBtn.id = `${actionList[i]}-id-${message.id}`;
		}
		messageBox.appendChild(actionBtn);
	}
	const reactBox = document.createElement('span');
	if (! pin) {
		reactBox.id = `reactBox-id-${message.id}`;
	}
	reactBox.style.background = '#B1CCE7';
	reactBox.style.borderRadius = '8px';
	reactBox.style.display = 'none';
	
	{/* <div class="btn-group dropend">
			<button type="button" class="btn btn-secondary dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
			Dropend
			</button>
			<ul class="dropdown-menu">
			
			</ul>
		</div> */}
	const reactDiv = document.createElement('div');
	reactDiv.classList.add('btn-group');
	reactDiv.classList.add('dropend');

	const reactBtn = document.createElement('button');
	reactBtn.classList.add('btn');
	reactBtn.classList.add('btn-sm');
	reactBtn.classList.add('dropdown-toggle');
	reactBtn.setAttribute('data-bs-toggle', 'dropdown');
	reactBtn.setAttribute('aria-expanded', 'false');
	reactBtn.innerText = 'react';
	const emojiDiv = document.createElement('div');
	emojiDiv.classList.add('dropdown-menu');
	emojiDiv.style.padding = '0rem';
	emojiDiv.style.height = '100%';
	emojiDiv.style.width = '100%';
	if (! pin) {
		emojiDiv.id = `emojiDiv-id-${message.id}`;
	}

	const emojiList = ['😃','😢','👀','🙌','✅'];
	for (let i = 0; i < 5; i++) {
		const li = document.createElement('button');
		li.innerText = emojiList[i];
		li.style.border = '0px';
		li.style.background = 'none';
		emojiDiv.appendChild(li);
	}
	reactDiv.appendChild(reactBtn);
	reactDiv.appendChild(emojiDiv);
	if (pin) {
		reactBtn.style.display = 'none';
	} else {
		reactBtn.id = `react-id-${message.id}`;
	}

	let messageP = null;
	if(message.message) {
		messageP = document.createElement('p');
		messageP.innerText = `${message.message}`;
	} else {
		// Viewing photos in channels
		messageP = document.createElement('img');
		messageP.src = `${message.image}`;
		messageP.style.display = 'block';
		messageP.classList.add('thumbnail');
		messageP.onclick = () => {
			document.getElementById("modal-image").src = message.image;
			document.getElementById("image-modal").style.display = "block";
		}
		document.getElementById('image-close').onclick = ()=>{
			document.getElementById("image-modal").style.display = "none";
		}
	}
	messageP.id = `messageP-${message.id}`;
	messageP.style.margin = '0px';
	// <input type="text" class="form-control" placeholder="Recipient's username" aria-label="Recipient's username" aria-describedby="button-addon2">
	
	const editmessageP = document.createElement('input');
	editmessageP.type = 'text';
	editmessageP.classList.add('form-control');
	editmessageP.style.display = 'none';

	let date = null;
	if (message.edited) {
		date = new Date(message.editedAt);
	} else {
		date = new Date(message.sentAt);
	}
	const formattedDate = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
	apiCallGet(`user/${message.sender}`, {}, true, globalToken)
	.then(user => {
		senderSpan.innerText = user.name;
		profileImg.src = user.image ? user.image : 'https://www.bsn.eu/wp-content/uploads/2016/12/user-icon-image-placeholder.jpg';
	})
	.catch(error => showAlert(error));
	if (! pin) {
		senderSpan.id = message.id;
	}
	senderSpan.style.fontWeight = 'bold';
	timeSpan.innerText = `${formattedDate}`;
	timeSpan.style.color = '#999';
	timeSpan.style.fontSize = '0.8rem';
	timeSpan.style.padding = '0 1rem';

	messageBox.style.padding = '0.5rem 1rem';
	messageBox.style.background = '#EBEBEB';
	messageBox.style.borderBottom = '0.1px solid #39393B';

	messageBox.appendChild(profileImg);
	messageBox.appendChild(senderSpan);
	messageBox.appendChild(timeSpan);
	messageBox.appendChild(reactDiv);


	const editStatus = document.createElement('span');
	editStatus.innerText = '(edited)';
	editStatus.id = `edit-status-${message.id}`;
	editStatus.style.fontSize = '0.8rem';
	editStatus.style.paddingLeft = '10px';
	editStatus.style.color = 'grey';
	editStatus.style.display = 'none';
	messageP.appendChild(editStatus);
	messageBox.appendChild(messageP);
	
	messageBox.appendChild(reactBox);
	messageBox.appendChild(editmessageP);

	return messageBox;

}

const loadMessages = (channel) => {

	console.log('loading messages...');
	apiCallGet(`message/${channel.id}`, 'start=0', true, globalToken)	
	.then(body => {
		const messageArr = body.messages;
		const parent = document.getElementById('message-container');
		while (parent.firstChild) {
			parent.removeChild(parent.firstChild);
		}

		const dropMenu = document.getElementById('dropdown-list');
		while (dropMenu.firstChild) {
			dropMenu.removeChild(dropMenu.firstChild);
		}
		
		messageArr.forEach(message => {
			const messageBox = messageBoxDesign(message);
			parent.appendChild(messageBox);
			// load pinned messages 
			if (message.pinned) {
				messageBox.style.background = '#FFFACE';
				const pinHint = document.createElement('span');
				pinHint.innerText = '📌 Pinned by you'
				pinHint.style.fontSize = '0.8rem';
				pinHint.style.color = 'grey';
				messageBox.appendChild(pinHint);
				
				const fixedBox = document.getElementById('fixed-box');
				fixedBox.style.display = 'block';
				const messageBoxPin = messageBoxDesign(message, true);
				const dropMenu = document.getElementById('dropdown-list');
				const unpinBtn = document.createElement('a');
				unpinBtn.innerText = "unpin";
				unpinBtn.style.fontSize = '0.8rem';
				unpinBtn.style.color = 'green';
				unpinBtn.style.textDecoration = 'underline';
				messageBoxPin.appendChild(unpinBtn);
				messageBoxPin.classList.add('dropdown-item');
				dropMenu.append(messageBoxPin);
				unpinBtn.addEventListener('click', (e)=>{
					e.preventDefault();
					apiCallPost(`message/unpin/${channel.id}/${message.id}`, {}, true, globalToken)
					.then(data => {
						console.log(data);
						loadMessages(channel);
					})
					.catch(error => showAlert(error));
				})
			}
			// load edited messages 
			if (message.edited) {
				const editSpan = document.getElementById(`edit-status-${message.id}`);
				editSpan.style.display = 'inline';
			}
			// load reacts
			const reactsArr = message.reacts;
			if (parseInt(reactsArr.length) > 0 ){
				const reactBox = document.getElementById(`reactBox-id-${message.id}`);
				reactBox.style.display = 'inline';
				reactsArr.forEach( react => {
					const emojiBox = document.createElement('span');
					emojiBox.innerText = react.react;
					emojiBox.style.padding = '0px 6px';
					reactBox.appendChild(emojiBox);
					// unreact
					emojiBox.addEventListener('click', () => {
						apiCallPost(`message/unreact/${channel.id}/${message.id}`, {react: emojiBox.innerText}, true, globalToken)
						.then((data)=>{
							console.log(data)
							reactBox.removeChild(emojiBox);
						})
						.catch(error => showAlert(error));
					})
				});
			}

			// delete message
			document.getElementById(`delete-id-${message.id}`).addEventListener('click', ()=>{
				apiCallDelete(`message/${channel.id}/${message.id}`, {}, true, globalToken)
				.then(data => {
					console.log(data);
					loadMessages(channel);
				})
				.catch(error => showAlert(error));
			});

			// edit message 
			document.getElementById(`edit-id-${message.id}`).addEventListener('click', ()=>{
				globalUserId = localStorage.getItem('userId');
				if (! (parseInt(globalUserId) === parseInt(message.sender))) {
					showAlert('You cannot edit message that you did not send');

				} else {
					const messageP = document.getElementById(`messageP-${message.id}`);
					const editmessageP = messageBox.querySelector('input');
					messageP.style.display = 'none';
					editmessageP.style.display = 'block';
					editmessageP.addEventListener('blur', (e)=>{
						e.preventDefault();
						const re = /^ *$/;
						if (re.test(editmessageP.value)) {
							showAlert('edited message cannot be the same or none!')
						} else {
							apiCallPut(`message/${channel.id}/${message.id}`, {
								message: message.message ? editmessageP.value:undefined,
								image: message.image ? editmessageP.value:undefined,
							}, true, globalToken)
							.then(data => {
								console.log(data);
								loadMessages(channel);
							})
							.catch(error => showAlert(error));
						}		
					})
				}

			});		
			
			// react message
			const emojiDiv = document.getElementById(`emojiDiv-id-${message.id}`);
			let emojiArr = emojiDiv.querySelectorAll('button');
			emojiArr.forEach(emojiBtn => {
				emojiBtn.addEventListener('click', ()=>{
					apiCallPost(`message/react/${channel.id}/${message.id}`, {
						react: emojiBtn.innerText,
					}, true, globalToken)
					.then((data)=>{
						console.log(data);
						loadMessages(channel);
					})
					.catch(error => showAlert(error));
				})
			});

			// pin message
			const pinBtn = document.getElementById(`pin-id-${message.id}`);
			pinBtn.addEventListener('click', (e)=>{
				e.preventDefault();
				apiCallPost(`message/pin/${channel.id}/${message.id}`, {}, true, globalToken)
				.then(data => {
					console.log(data);
					loadMessages(channel);
				})
				.catch(error => showAlert(error));
			})


			// click user name of messagebox to show user profile
			const senderSpan = document.getElementById(message.id);
			
			senderSpan.onclick = () => {
				apiCallGet(`user/${message.sender}`, {}, true, globalToken)
				.then(user => {
					document.getElementById('profile-photo').src = user.image ? user.image : 'https://www.bsn.eu/wp-content/uploads/2016/12/user-icon-image-placeholder.jpg';
					document.getElementById('profile-name').style.display = 'inline';
					document.getElementById('profile-name').textContent = user.name;
					document.getElementById('profile-bio').textContent = user.bio;
					document.getElementById('profile-email').textContent = user.email;
					document.getElementById('profile-password').style.display = 'none';

					showpage('user-profile');
				})
			}
		});
	})
	.catch(error => showAlert(error));



}


const joinChannel = (channel) => {
	document.getElementById(`join-channel-${channel.id}`).onclick = ()=>{
		apiCallPost(`channel/${channel.id}/join`, {}, true, globalToken)
		.then(body => {
			showpage('dashboard-channels');
			console.log(body);
			showAlert('You have joined the channel!');
			
		})
		.catch(error => showAlert(error))
	};
}

const leaveChannel = (channel) => {
	document.getElementById(`leave-channel-${channel.id}`).onclick = ()=>{
		apiCallPost(`channel/${channel.id}/leave`, {}, true, globalToken)
		.then(body => {
			showpage('dashboard-channels');
			console.log(body)
			showAlert('You have left the channel!');
		})
		.catch(error => showAlert(error))
	}
}

const editChannel = (channel) => {
	document.getElementById('edit-channel-submit').onclick = () => {
		
		const name = document.getElementById('edit-channel-name').value;
		let description = document.getElementById('edit-description').value;
	
		if (description === null || description === "") {
			description = 'no description';
		}  
		apiCallPut(`channel/${channel.id}`, {
			name: name,
			description: description,
		}, true, globalToken)
		.then(data => {
			console.log(data);
			showpage('dashboard-channels');
		})
		.catch(error => showAlert(error));
		
		document.getElementById('page-edit-channel').style.display = 'none';
	}
}

const channelboxDesign = (channel) => {
	const channelbox = document.createElement('div');
	channelbox.innerText = `${channel.name}`
	channelbox.style.background = channel.private === false ? '#D9EDE1':'#D7B0F6';
	channelbox.style.color = 'green';
	channelbox.style.border = '1px solid green';
	channelbox.style.borderRadius = '5px';
	channelbox.style.lineHeight = '30px';
	channelbox.style.textAlign = 'center';
	channelbox.style.marginTop = '10px';	
	channelbox.id = channel.id;
	return channelbox;
}

const channelboxClickHandle = (channel) => {
	const channelProfile = document.getElementById('channel-profile');
	channelProfile.querySelectorAll('a').forEach(element => {
		element.id = `${element.innerText}-channel`;
		element.id = element.id+`-${channel.id}`;
	});
	channelProfile.querySelector('button').id = 'addUserButton';
	channelProfile.querySelector('button').id = channelProfile.querySelector('button').id + `-${channel.id}`;
	document.getElementById(`edit-channel-${channel.id}`).addEventListener('click', (e)=> {
		e.preventDefault();
		document.getElementById('page-edit-channel').style.display = 'block';
	}); 
	// If the user is not a member of this channel
	globalUserId = localStorage.getItem('userId');
	localStorage.setItem('globalChannelId', channel.id);
	if (! channel.members.includes(parseInt(globalUserId))) {
		showChannelInfo(channel);
		showpage('channel-view');
		document.getElementById(`edit-channel-${channel.id}`).style.display = 'none';
		document.getElementById('invite-members').style.display = 'none';
		document.getElementById('message-container').style.display = 'none';
		document.getElementById('message-input').style.display = 'none';

		joinChannel(channel);	
		
	} else {	// If the user is a member of the channel
		apiCallGet(`channel/${channel.id}`, {}, true, globalToken)	// user can get details of specific channel
		.then(body => {
			showChannelInfo(body);
			showpage('channel-view');

			// user can update details of specific channel (put)
			document.getElementById(`edit-channel-${channel.id}`).style.display = 'inline-block';
			editChannel(channel);
			// user can leave channel
			leaveChannel(channel);
			// user can invite members
			document.getElementById('invite-members').style.display = 'inline-block';
			inviteMembers(channel);

			// show messages in the message container
			document.getElementById('message-container').style.display = 'block';
			document.getElementById('message-input').style.display = 'flex';
			
			loadMessages(channel);
			// send messages
			// add a button onclick to make the placeholder of input change into the other mode
			document.getElementById('message-text').placeholder = "Message";
			document.getElementById('upload-image').onclick = ()=>{
				document.getElementById('message-text').placeholder = 'upload image';
				document.getElementById('message-text').type = 'file';
				
			}
			document.getElementById('input-text').onclick = ()=>{
				document.getElementById('message-text').placeholder = 'Message';
				document.getElementById('message-text').type = 'text';
			}
			document.getElementById('message-submit').onclick = ()=>{
				let image = undefined;
				let text = undefined;
				if (document.getElementById('message-text').placeholder === 'Message') {
					text = document.getElementById('message-text').value;
					const re = /^ *$/;
					if (re.test(text)) {
						showAlert('message cannot be none or spaces');
					} else {
						console.log(`message:${text}`);
						apiCallPost(`message/${channel.id}`, {
							message: text ? text:undefined,
							image: image ? image:undefined,
						}, true, globalToken)
						.then(data => {
							console.log(data);
						})
						.catch(error => showAlert(error));
						
						document.getElementById('message-text').value = '';
						loadMessages(channel);
					}
				} else { // Sending photos in channels
					const imageFile = document.getElementById('message-text').files[0];
					
					fileToDataUrl(imageFile)
					.then(data => {
						image = data;
						console.log(`image:${image}`);
						apiCallPost(`message/${channel.id}`, {
							message: text ? text:undefined,
							image: image ? image:undefined,
						}, true, globalToken)
						.then(data => {
							console.log(data);
						})
						.catch(error => showAlert(error));						
					})
					.catch(error=>showAlert(error))

					loadMessages(channel);
				}
	
			};
		})
		.catch(error => showAlert(error));

	}
}

const loadChannels = () => {
	channelIds = [];   
	const parent = document.getElementById('page-dashboard-channels');
	while (parent.firstChild) {
		parent.removeChild(parent.firstChild);
	}	// every time load dashboard, remove all channelbox and rebuild them
	document.getElementsByTagName('main')[0].style.margin = '5% 10%';
	const channels = document.getElementById('page-dashboard-channels');
	apiCallGet('channel', {}, true, globalToken)
	.then(body => {
		body.channels.forEach(channel => {
			if ( ! channelIds.includes(channel.id)) {
				globalUserId = localStorage.getItem('userId');
				channelIds.push(channel.id);
				if (channel.private === false || channel.members.includes(parseInt(globalUserId)) || channel.creator === parseInt(globalUserId)) {
					const channelbox = channelboxDesign(channel);
					channels.appendChild(channelbox);
					channelbox.onclick = ()=>{
						channelboxClickHandle(channel);
					}
				}
			}
		});
	})
	.catch(error => showAlert(error));
	// 2.4.3 Viewing and editing user's own profile
	document.getElementById('navbar-user-profile').onclick = () => {
		globalUserId = localStorage.getItem('userId');
		apiCallGet(`user/${globalUserId}`, {}, true, globalToken)
		.then(user => {
			document.getElementById('profile-photo').src = user.image?user.image : 'https://www.bsn.eu/wp-content/uploads/2016/12/user-icon-image-placeholder.jpg';
			document.getElementById('profile-name').style.display = 'inline';
			document.getElementById('profile-email').style.display = 'inline';
			document.getElementById('profile-photo').style.display = 'inline';
			document.getElementById('profile-bio').style.display = 'inline';

			document.getElementById('profile-name').textContent = user.name;
			document.getElementById('profile-bio').textContent = user.bio;
			document.getElementById('profile-email').textContent = user.email;
			document.getElementById('profile-password').style.display = 'block';

			document.getElementById('user-profile-pwd').value = '';
			document.getElementById('profile-password').querySelector('button').onclick = ()=>{
				const newPwd = document.getElementById('user-profile-pwd').value;
				apiCallPut('user', {
					email: undefined,
					password: newPwd,
					name:undefined,
					bio: undefined,
					image: undefined,
				}, true, globalToken)
				.then(data=>{
					console.log(data);
					showpage('dashboard-channels');
				})
			}

			const editProfileArr = ['photo', 'name', 'bio', 'email'];
			editProfileArr.forEach(element => {
				document.getElementById(`page-user-profile-${element}`).querySelector('button').textContent = `edit ${element}`;
				document.getElementById(`page-user-profile-${element}`).querySelector('input').style.display = 'none';
				document.getElementById(`page-user-profile-${element}`).querySelector('button').onclick = ()=>{
					document.getElementById(`page-user-profile-${element}`).querySelector('input').style.display = 'inline';
					document.getElementById(`profile-${element}`).style.display = 'none';
					document.getElementById(`page-user-profile-${element}`).querySelector('button').textContent = 'save';
					document.getElementById(`page-user-profile-${element}`).querySelector('button').onclick = ()=>{
						if (element === 'photo') {
							const elementVal = document.getElementById(`page-user-profile-${element}`).querySelector('input').files[0];
							fileToDataUrl(elementVal)
							.then(data=> {
								const image = data;
								apiCallPut('user', {
									email: element==='email' ? elementVal:undefined,
									password: undefined,
									name: element==='name' ? elementVal:undefined,
									bio: element==='bio' ? elementVal:undefined,
									image: element==='photo' ? image:undefined,
								}, true, globalToken)
								.then(data=>{
									console.log(data);
									showpage('dashboard-channels');
								})

							})
						} else {

							const elementVal = document.getElementById(`page-user-profile-${element}`).querySelector('input').value;
							apiCallPut('user', {
								email: element==='email' ? elementVal:undefined,
								password: undefined,
								name: element==='name' ? elementVal:undefined,
								bio: element==='bio' ? elementVal:undefined,
								image: element==='photo' ? elementVal:undefined,
							}, true, globalToken)
							.then(data=>{
								console.log(data);
								showpage('dashboard-channels');
							})
						}
					}
					
				}
			});
			showpage('user-profile');
		})
	}
}
// pass in the channel object
const showChannelInfo = (channel) => {
	globalChannelId = localStorage.getItem('globalChannelId');
	globalUserId = localStorage.getItem('userId');
	const privacy = channel.private === false ? 'public':'private';
	document.getElementById('channel-name').innerText = channel.name+ ` (${privacy})`;
	document.getElementById('channel-description').innerText = (! channel.members.includes(parseInt(globalUserId))) ? 'You are not a member yet! Join us~':channel.description;
	document.getElementById(`join-channel-${globalChannelId}`).style.display =  (! channel.members.includes(parseInt(globalUserId))) ? 'inline-block':'none';

	document.getElementById(`leave-channel-${globalChannelId}`).style.display =  (channel.members.includes(parseInt(globalUserId))) ? 'inline-block':'none';

	const date = new Date(channel.createdAt);
	const formattedDate = date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
	apiCallGet(`user/${channel.creator}`, {}, true, globalToken)
	.then(user => {
		document.getElementById('channel-info').innerText =  (! channel.members.includes(parseInt(globalUserId))) ? '':`created by ${user.name} at ${formattedDate}`;
	})
	.catch(error=>showAlert(error))

}

const showpage = (pagename) => {

	const blockArr = document.querySelectorAll('.page-block');
	blockArr.forEach(element => {
		element.style.display = 'none';
	});

	document.getElementById(`page-${pagename}`).style.display = 'block';
	if (pagename === 'dashboard-channels' || pagename === 'channel-view') {
		document.getElementById('page-nav-dashboard').style.display = 'block';
		loadChannels();
	} else {
		document.getElementsByTagName('main')[0].style.margin = '5% 25%';
	}
}
showpage('login');  // initial page




// register page
document.getElementById('register-submit').addEventListener('click', (e) => {
	const email = document.getElementById('register-email').value;
	const name = document.getElementById('register-name').value;
	const password = document.getElementById('register-password').value;
	const passwordConfirm = document.getElementById('register-password-confirm').value;
	if (password !== passwordConfirm) {
		showAlert('Passwords need to match');
	} else {
		console.log(email, name, password, passwordConfirm);
		apiCallPost('auth/register', {
			email: email,
			name: name,
			password,
		}, false, globalToken)
		.then(data => {
			const {token, userId} = data;
			globalToken = token;
			globalUserId = userId;
			localStorage.setItem('token', token);
			localStorage.setItem('userId', parseInt(userId));
			localStorage.setItem('userPwd', password);
			console.log(`userid: ${globalUserId}`);
			showpage('dashboard-channels'); 
		})
		.catch(error => showAlert(error));
	}
});

// login page
document.getElementById('login-submit').addEventListener('click', (e) => {
	const email = document.getElementById('login-email').value;
	const password = document.getElementById('login-password').value;

	apiCallPost('auth/login', {
		email: email,
		password: password
	}, false, globalToken)
	.then(data => {
		const {token, userId} = data;
		globalToken = token;
		globalUserId = userId;
		localStorage.setItem('token', token);
		localStorage.setItem('userId', parseInt(userId));
		localStorage.setItem('userPwd', password);
		console.log(`userid: ${globalUserId}`);
		showpage('dashboard-channels');
	})
	.catch(error => showAlert(error));
});

// logout to remove localstorage token
document.getElementById('logout').addEventListener('click', (e) => {	
	e.preventDefault();
	apiCallPost('auth/logout', {}, true, globalToken)
	.then(data => {
		console.log(data);
	})
	.catch(error => showAlert(error));
	localStorage.removeItem('token');
	localStorage.removeItem('userId');
	localStorage.removeItem('userPwd');
	showpage('login');
})




document.getElementById('custom-alert-close').addEventListener('click', closeAlert);	// alert close button 
document.getElementById('GoToSignup').addEventListener('click', ()=> showpage('signup')); // new member register button
document.getElementById('BackToLogin').addEventListener('click', ()=>showpage('login'));
document.getElementById('navbar-dashboard').addEventListener('click', ()=>showpage('dashboard-channels'));
document.getElementById('page-user-profile').querySelector('a').onclick = ()=> {
	showpage('dashboard-channels');
}


// #### new channel popup page #####
document.getElementById('create-channel').addEventListener('click', (e)=> {
	e.preventDefault();
	document.getElementById('page-create-channel').style.display = 'block';
}); 

document.getElementById('new-channel-submit').addEventListener('click', (e) => {
	e.preventDefault();
	const name = document.getElementById('new-channel-name').value;
	let description = document.getElementById('description').value;
	const status = document.getElementById('public').checked ? false:true;
	
	if (description === null || description === "") {
		description = 'no description';
	}  
	apiCallPost('channel', {
		name: name,
		private: status,
		description: description,
	}, true, globalToken)
	.then(data => {
		showpage('dashboard-channels');
	})
	.catch(error => showAlert(error));
	
	document.getElementById('page-create-channel').style.display = 'none';
})
// ####


const newChannelClose = document.getElementsByClassName("newchannel-close")[0];
newChannelClose.addEventListener('click', () => {
	document.getElementById('page-create-channel').style.display = 'none';
})
const editChannelClose = document.getElementsByClassName("newchannel-close")[1];
editChannelClose.addEventListener('click', () => {
	document.getElementById('page-edit-channel').style.display = 'none';
})


globalToken = localStorage.getItem('token'); // get globalToken even after refresh
globalUserId = localStorage.getItem('userId');
if (globalToken === null) {
	showpage('login');
} else {
	showpage('dashboard-channels');
}
