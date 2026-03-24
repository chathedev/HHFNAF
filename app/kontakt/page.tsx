"use client"

import type React from "react"

import { Header } from "@/components/header"
import Footer from "@/components/footer"
import { Mail, User, MessageSquare, Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"

export default function KontaktPage() {
  const [content, setContent] = useState<any>(null)
  const [isEditorMode, setIsEditorMode] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  })
  const [formStatus, setFormStatus] = useState<"idle" | "loading" | "success" | "error">("idle")

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const editorMode = urlParams.get("editor") === "true"
    setIsEditorMode(editorMode)

    fetch("/content/kontakt.json")
      .then((res) => res.json())
      .then((data) => setContent(data))
      .catch((err) => {
        console.error("Failed to load content:", err)
        setContent({
          pageTitle: "Kontakta Oss",
          pageDescription: "Har du frågor eller funderingar? Tveka inte att höra av dig till oss!",
          departments: [
            {
              title: "Sponsring & Marknadsföring",
              description: "Vill du sponsra oss eller samarbeta?",
              email: "marknad@harnosandshf.se",
            },
            {
              title: "Kommunikation",
              description: "Media, press och kommunikation",
              email: "kommunikation@harnosandshf.se",
            },
            {
              title: "Föreningsinsats",
              description: "Förenings- och arbetsinsatser",
              email: "foreningsinsats@harnosandshf.se",
            },
            {
              title: "Sport & Träning",
              description: "Frågor om träning och sportverksamhet",
              email: "sport@harnosandshf.se",
            },
            {
              title: "Ekonomi",
              description: "Ekonomiska frågor och fakturor",
              email: "ekonomi@harnosandshf.se",
            },
            {
              title: "Styrelsen",
              description: "Kontakt med föreningens styrelse",
              email: "styrelsen@harnosandshf.se",
            },
          ],
          generalContact: {
            title: "Allmänna frågor",
            description: "För allmänna frågor och information",
            email: "kontakt@harnosandshf.se",
          },
          contactForm: {
            title: "Skicka meddelande",
            nameLabel: "Namn *",
            namePlaceholder: "Ditt namn",
            emailLabel: "E-post *",
            emailPlaceholder: "din@email.se",
            subjectLabel: "Ämne",
            subjectPlaceholder: "Vad gäller ditt meddelande?",
            messageLabel: "Meddelande *",
            messagePlaceholder: "Skriv ditt meddelande här...",
            submitButton: "Skicka meddelande",
          },
          socialMedia: {
            title: "Följ oss på sociala medier",
            facebookUrl: "https://www.facebook.com/harnosandshf",
            instagramUrl: "https://www.instagram.com/harnosandshf",
          },
          faq: {
            title: "Vanliga frågor om att börja träna",
            items: [
              {
                question: "Hur börjar jag spela handboll i Härnösands HF?",
                answer:
                  "Det enklaste sättet att börja är att kontakta oss! Vi hjälper dig att hitta rätt lag baserat på din ålder och erfarenhet. Du kan fylla i vårt kontaktformulär eller skicka ett mejl direkt till oss.",
              },
              {
                question: "Vilken utrustning behöver jag?",
                answer:
                  "Till en början behöver du bara bekväma träningskläder, inomhusskor och en vattenflaska. Handbollar finns att låna under träningarna. När du väl bestämmer dig för att fortsätta kan du behöva klubbkläder.",
              },
              {
                question: "Finns det provträningar?",
                answer:
                  "Absolut! Vi erbjuder alltid några kostnadsfria provträningar så att du kan känna efter om handboll är något för dig. Detta ger dig en chans att träffa laget och tränarna innan du bestämmer dig.",
              },
              {
                question: "Hur anmäler jag mig?",
                answer:
                  "Efter dina provträningar får du information om hur du enkelt anmäler dig och blir en fullvärdig medlem i Härnösands HF. Vi ser fram emot att välkomna dig till vår handbollsfamilj!",
              },
            ],
            ctaButton: "Kontakta oss för mer information",
          },
        })
      })
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormStatus("loading")

    try {
      const response = await fetch("https://api.harnosandshf.se/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
        }),
      })

      if (!response.ok) {
        throw new Error("Request failed")
      }

      setFormStatus("success")
      setFormData({ name: "", email: "", subject: "", message: "" })
    } catch {
      setFormStatus("error")
    }
  }

  if (!content) {
    return (
      <>
        <Header />
        <main className="flex-1 bg-white">
          <div className="h-24"></div>
          <div className="container px-4 md:px-6 py-8 md:py-12 lg:py-16 max-w-7xl mx-auto w-full">
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-600">Loading...</div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="flex-1 bg-white">
        <div className="h-24"></div> {/* Spacer for fixed header */}
        <div className="container px-4 md:px-6 py-8 md:py-12 lg:py-16 max-w-7xl mx-auto w-full">
          <h1
            className="text-5xl font-bold text-green-700 mb-4 text-center"
            {...(isEditorMode && { "data-editable": "true", "data-field-path": "kontakt.pageTitle" })}
          >
            {content.pageTitle}
          </h1>
          <p
            className="text-xl text-gray-700 mb-12 text-center max-w-3xl mx-auto"
            {...(isEditorMode && { "data-editable": "true", "data-field-path": "kontakt.pageDescription" })}
          >
            {content.pageDescription}
          </p>

          <div className="max-w-6xl mx-auto mb-12">
            {/* Department Email Contacts */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {content.departments.map((dept: any, index: number) => (
                <div key={index} className="bg-white/90 shadow-lg rounded-lg p-6 text-center">
                  <Mail className="w-10 h-10 text-orange-500 mb-3 mx-auto" />
                  <h3
                    className="text-lg font-semibold text-gray-800 mb-2"
                    {...(isEditorMode && {
                      "data-editable": "true",
                      "data-field-path": `kontakt.departments.${index}.title`,
                    })}
                  >
                    {dept.title}
                  </h3>
                  <p
                    className="text-sm text-gray-600 mb-3"
                    {...(isEditorMode && {
                      "data-editable": "true",
                      "data-field-path": `kontakt.departments.${index}.description`,
                    })}
                  >
                    {dept.description}
                  </p>
                  <a
                    href={`mailto:${dept.email}`}
                    className="text-green-700 hover:underline font-medium"
                    {...(isEditorMode && {
                      "data-editable": "true",
                      "data-field-path": `kontakt.departments.${index}.email`,
                    })}
                  >
                    {dept.email}
                  </a>
                </div>
              ))}
            </div>

            {/* General Email Contact Card */}
            <div className="bg-white/90 shadow-lg rounded-lg p-8 text-center mb-8">
              <Mail className="w-12 h-12 text-orange-500 mb-4 mx-auto" />
              <h2
                className="text-2xl font-semibold text-gray-800 mb-2"
                {...(isEditorMode && { "data-editable": "true", "data-field-path": "kontakt.generalContact.title" })}
              >
                {content.generalContact.title}
              </h2>
              <p
                className="text-lg text-gray-700 mb-4"
                {...(isEditorMode && {
                  "data-editable": "true",
                  "data-field-path": "kontakt.generalContact.description",
                })}
              >
                {content.generalContact.description}
              </p>
              <a
                href={`mailto:${content.generalContact.email}`}
                className="text-green-700 hover:underline text-lg font-medium"
                {...(isEditorMode && { "data-editable": "true", "data-field-path": "kontakt.generalContact.email" })}
              >
                {content.generalContact.email}
              </a>
            </div>

            {/* Contact Form */}
            <div className="bg-white/90 shadow-lg rounded-lg p-8">
              <div className="flex items-center justify-center mb-6">
                <MessageSquare className="w-8 h-8 text-orange-500 mr-3" />
                <h2
                  className="text-2xl font-semibold text-gray-800"
                  {...(isEditorMode && { "data-editable": "true", "data-field-path": "kontakt.contactForm.title" })}
                >
                  {content.contactForm.title}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label
                      htmlFor="name"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                      {...(isEditorMode && {
                        "data-editable": "true",
                        "data-field-path": "kontakt.contactForm.nameLabel",
                      })}
                    >
                      {content.contactForm.nameLabel}
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder={content.contactForm.namePlaceholder}
                        className="pl-10 border-gray-300 focus:border-green-500 focus:ring-green-500"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label
                      htmlFor="email"
                      className="text-sm font-medium text-gray-700 mb-2 block"
                      {...(isEditorMode && {
                        "data-editable": "true",
                        "data-field-path": "kontakt.contactForm.emailLabel",
                      })}
                    >
                      {content.contactForm.emailLabel}
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder={content.contactForm.emailPlaceholder}
                        className="pl-10 border-gray-300 focus:border-green-500 focus:ring-green-500"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="subject"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                    {...(isEditorMode && {
                      "data-editable": "true",
                      "data-field-path": "kontakt.contactForm.subjectLabel",
                    })}
                  >
                    {content.contactForm.subjectLabel}
                  </Label>
                  <Input
                    id="subject"
                    name="subject"
                    type="text"
                    placeholder={content.contactForm.subjectPlaceholder}
                    className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                    value={formData.subject}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <Label
                    htmlFor="message"
                    className="text-sm font-medium text-gray-700 mb-2 block"
                    {...(isEditorMode && {
                      "data-editable": "true",
                      "data-field-path": "kontakt.contactForm.messageLabel",
                    })}
                  >
                    {content.contactForm.messageLabel}
                  </Label>
                  <Textarea
                    id="message"
                    name="message"
                    placeholder={content.contactForm.messagePlaceholder}
                    rows={5}
                    className="border-gray-300 focus:border-green-500 focus:ring-green-500 resize-none"
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                {formStatus === "success" && (
                  <div className="bg-green-50 border border-green-200 text-green-800 rounded-md p-4 text-center">
                    Tack! Ditt meddelande har skickats. Vi återkommer så snart vi kan.
                  </div>
                )}

                {formStatus === "error" && (
                  <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 text-center">
                    Något gick fel. Försök igen eller skicka ett mail direkt.
                  </div>
                )}

                <div className="text-center">
                  <Button
                    type="submit"
                    disabled={formStatus === "loading"}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-md text-lg font-semibold transition-colors inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {formStatus === "loading" ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Skickar...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        <span
                          {...(isEditorMode && {
                            "data-editable": "true",
                            "data-field-path": "kontakt.contactForm.submitButton",
                          })}
                        >
                          {content.contactForm.submitButton}
                        </span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          <div className="mt-16 text-center">
            <p className="text-gray-500 text-sm">
              Du kan också nå oss direkt via e-post på{" "}
              <a href="mailto:kontakt@harnosandshf.se" className="text-green-700 hover:underline font-medium">
                kontakt@harnosandshf.se
              </a>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
