"use client"

import type React from "react"

import { Header } from "@/components/header"
import Footer from "@/components/footer"
import { Mail, Send, Loader2, ChevronDown, Facebook, Instagram, ArrowRight } from "lucide-react"
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
  const [openFaq, setOpenFaq] = useState<number | null>(0)

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
              title: "Sport & Träning",
              description: "Frågor om träning och sportverksamhet",
              email: "sport@harnosandshf.se",
            },
            {
              title: "Ekonomi",
              description: "Ekonomiska frågor och fakturor",
              email: "ekonomi@harnosandshf.se",
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

        {/* Header */}
        <div className="border-b border-gray-100">
          <div className="container px-4 md:px-6 py-10 md:py-16 max-w-7xl mx-auto w-full text-center">
            <h1
              className="text-3xl md:text-4xl font-bold mb-3 tracking-tight text-gray-900"
              {...(isEditorMode && { "data-editable": "true", "data-field-path": "kontakt.pageTitle" })}
            >
              {content.pageTitle}
            </h1>
            <p
              className="text-base md:text-lg text-gray-500 max-w-xl mx-auto"
              {...(isEditorMode && { "data-editable": "true", "data-field-path": "kontakt.pageDescription" })}
            >
              {content.pageDescription}
            </p>
          </div>
        </div>

        <div className="container px-4 md:px-6 py-10 md:py-16 max-w-7xl mx-auto w-full">
          <div className="max-w-6xl mx-auto">
            {/* Contact cards: general contact featured, departments alongside */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
              <div className="rounded-xl border border-gray-200 p-6 flex flex-col">
                <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center mb-4">
                  <Mail className="w-4 h-4 text-green-700" />
                </div>
                <h2
                  className="text-base font-semibold text-gray-900 mb-1"
                  {...(isEditorMode && { "data-editable": "true", "data-field-path": "kontakt.generalContact.title" })}
                >
                  {content.generalContact.title}
                </h2>
                <p
                  className="text-sm text-gray-500 mb-4 flex-1"
                  {...(isEditorMode && {
                    "data-editable": "true",
                    "data-field-path": "kontakt.generalContact.description",
                  })}
                >
                  {content.generalContact.description}
                </p>
                <a
                  href={`mailto:${content.generalContact.email}`}
                  className="text-sm font-medium text-green-700 hover:text-green-800 w-fit"
                  {...(isEditorMode && { "data-editable": "true", "data-field-path": "kontakt.generalContact.email" })}
                >
                  {content.generalContact.email}
                </a>
              </div>

              {content.departments.map((dept: any, index: number) => (
                <div
                  key={index}
                  className="rounded-xl border border-gray-200 p-6 flex flex-col"
                >
                  <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center mb-4">
                    <Mail className="w-4 h-4 text-green-700" />
                  </div>
                  <h3
                    className="text-base font-semibold text-gray-900 mb-1"
                    {...(isEditorMode && {
                      "data-editable": "true",
                      "data-field-path": `kontakt.departments.${index}.title`,
                    })}
                  >
                    {dept.title}
                  </h3>
                  <p
                    className="text-sm text-gray-500 mb-4 flex-1"
                    {...(isEditorMode && {
                      "data-editable": "true",
                      "data-field-path": `kontakt.departments.${index}.description`,
                    })}
                  >
                    {dept.description}
                  </p>
                  <a
                    href={`mailto:${dept.email}`}
                    className="text-sm font-medium text-green-700 hover:text-green-800 w-fit"
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

            <div className="max-w-2xl mx-auto">
              {/* Contact Form */}
              <div>
                <h2
                  className="text-lg font-semibold text-gray-900 mb-6"
                  {...(isEditorMode && { "data-editable": "true", "data-field-path": "kontakt.contactForm.title" })}
                >
                  {content.contactForm.title}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        placeholder={content.contactForm.namePlaceholder}
                        className="h-11 border-gray-300 focus:border-green-500 focus:ring-green-500"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                      />
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
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder={content.contactForm.emailPlaceholder}
                        className="h-11 border-gray-300 focus:border-green-500 focus:ring-green-500"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                      />
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
                      className="h-11 border-gray-300 focus:border-green-500 focus:ring-green-500"
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
                    <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 text-center text-sm">
                      Tack! Ditt meddelande har skickats. Vi återkommer så snart vi kan.
                    </div>
                  )}

                  {formStatus === "error" && (
                    <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 text-center text-sm">
                      Något gick fel. Försök igen eller skicka ett mail direkt.
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={formStatus === "loading"}
                    className="w-full md:w-auto bg-orange-500 hover:bg-orange-600 text-white px-8 h-12 rounded-lg text-base font-semibold transition-colors inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
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
                </form>
              </div>

              {/* Social links, below the form — direct email is already covered above */}
              {content.socialMedia && (content.socialMedia.facebookUrl || content.socialMedia.instagramUrl) && (
                <div className="mt-10 pt-8 border-t border-gray-100">
                  <p
                    className="text-sm font-medium text-gray-500 mb-4"
                    {...(isEditorMode && { "data-editable": "true", "data-field-path": "kontakt.socialMedia.title" })}
                  >
                    {content.socialMedia.title || "Följ oss på sociala medier"}
                  </p>
                  <div className="flex gap-3">
                    {content.socialMedia.facebookUrl && (
                      <a
                        href={content.socialMedia.facebookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:text-green-700 hover:border-green-200 transition-colors"
                        aria-label="Facebook"
                      >
                        <Facebook className="w-4 h-4" />
                      </a>
                    )}
                    {content.socialMedia.instagramUrl && (
                      <a
                        href={content.socialMedia.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:text-green-700 hover:border-green-200 transition-colors"
                        aria-label="Instagram"
                      >
                        <Instagram className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* FAQ */}
            {content.faq && content.faq.items && content.faq.items.length > 0 && (
              <div className="mt-16 max-w-3xl mx-auto">
                <h2
                  className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-8"
                  {...(isEditorMode && { "data-editable": "true", "data-field-path": "kontakt.faq.title" })}
                >
                  {content.faq.title}
                </h2>
                <div className="space-y-3">
                  {content.faq.items.map((item: any, index: number) => {
                    const isOpen = openFaq === index
                    return (
                      <div
                        key={index}
                        className="rounded-xl bg-white border border-gray-200/80 overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenFaq(isOpen ? null : index)}
                          className="w-full flex items-center justify-between gap-4 text-left px-5 py-4"
                        >
                          <span
                            className="font-semibold text-gray-900"
                            {...(isEditorMode && {
                              "data-editable": "true",
                              "data-field-path": `kontakt.faq.items.${index}.question`,
                            })}
                          >
                            {item.question}
                          </span>
                          <ChevronDown
                            className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                        {isOpen && (
                          <p
                            className="px-5 pb-4 text-sm text-gray-600 leading-relaxed"
                            {...(isEditorMode && {
                              "data-editable": "true",
                              "data-field-path": `kontakt.faq.items.${index}.answer`,
                            })}
                          >
                            {item.answer}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
                {content.faq.ctaButton && (
                  <div className="text-center mt-8">
                    <a
                      href="#top"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-green-700 hover:text-green-800"
                    >
                      {content.faq.ctaButton}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
